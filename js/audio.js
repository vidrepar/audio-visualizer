/**
 * Audio input and frequency analysis.
 *
 * The engine analyses one of two things:
 *
 * - a decoded buffer it plays itself (the demo track, or a file the visitor
 *   picked), where it also owns the transport;
 * - a live MediaStream (captured tab audio, or a microphone), where something
 *   else — a YouTube player, another app — owns playback and the engine only
 *   listens.
 *
 * The analyser is deliberately never wired to the destination. Buffer playback
 * fans out to the speakers on its own branch, so a captured stream cannot be
 * routed back out and fed into itself.
 */

var FFT_SIZE = 8192;

// Bins covering roughly 0-540Hz at a 44.1/48kHz sample rate: sub-bass and bass.
var BASS_BIN_COUNT = 92;

export class AudioEngine {

    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();

        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = FFT_SIZE;

        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

        this.mode = 'idle'; // 'buffer' | 'stream' | 'idle'

        this.buffer = null;
        this.source = null;
        this.playing = false;
        this.starting = false;

        // Seconds of the buffer already played, and the context clock reading
        // at which the current source started.
        this.offset = 0;
        this.startedAt = 0;

        this.stream = null;
        this.streamNode = null;

        this.onEnded = null;
    }

    /** Browsers start the context suspended until a user gesture. */
    async resume() {
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    /* ---------------------------------------------------------------- buffer */

    async loadUrl(url) {
        var response = await fetch(url);

        if (!response.ok) {
            throw new Error('Could not load ' + url + ' (HTTP ' + response.status + ')');
        }

        await this.setBuffer(await response.arrayBuffer());
    }

    async loadFile(file) {
        await this.setBuffer(await file.arrayBuffer());
    }

    async setBuffer(arrayBuffer) {
        var decoded = await this.context.decodeAudioData(arrayBuffer);

        this.stop();
        this.detachStream();

        this.buffer = decoded;
        this.offset = 0;
        this.mode = 'buffer';
    }

    get duration() {
        return this.mode === 'buffer' && this.buffer ? this.buffer.duration : 0;
    }

    /** Playback position in seconds. Meaningless for a live stream. */
    get currentTime() {
        if (this.mode !== 'buffer') return 0;
        if (!this.playing) return this.offset;
        return Math.min(this.offset + (this.context.currentTime - this.startedAt), this.duration);
    }

    async play() {
        if (this.mode !== 'buffer' || this.playing || this.starting || !this.buffer) return;

        this.starting = true;
        try {
            await this.resume();
        } finally {
            this.starting = false;
        }

        var source = this.context.createBufferSource();
        source.buffer = this.buffer;

        // The analyser branch is a tap; the speakers are fed directly.
        source.connect(this.analyser);
        source.connect(this.context.destination);

        source.onended = () => {
            // Only a track that ran to its end reports back; a source stopped
            // by pause() or stop() is torn down deliberately.
            if (this.source !== source) return;

            this.playing = false;
            this.offset = 0;
            this.source = null;

            if (this.onEnded) this.onEnded();
        };

        source.start(0, this.offset);

        this.source = source;
        this.startedAt = this.context.currentTime;
        this.playing = true;
    }

    pause() {
        if (!this.playing) return;

        this.offset = this.currentTime;
        this.playing = false;

        var source = this.source;
        this.source = null;
        source.stop();
    }

    /** Stop playback and rewind to the start. */
    stop() {
        this.pause();
        this.offset = 0;
    }

    /* ---------------------------------------------------------------- stream */

    /**
     * Listen to a live MediaStream instead of playing a buffer. The stream is
     * only tapped, never played back, so capturing this tab's own audio cannot
     * turn into a feedback loop.
     */
    async attachStream(stream) {
        this.stop();
        this.detachStream();
        await this.resume();

        this.stream = stream;
        this.streamNode = this.context.createMediaStreamSource(stream);
        this.streamNode.connect(this.analyser);
        this.mode = 'stream';

        var track = stream.getAudioTracks()[0];
        if (track) {
            // The visitor can revoke a capture from the browser's own UI.
            track.addEventListener('ended', () => this.detachStream());
        }
    }

    detachStream() {
        if (!this.stream) return;

        this.streamNode.disconnect();
        this.stream.getTracks().forEach(function (track) { track.stop(); });

        this.stream = null;
        this.streamNode = null;
        this.mode = this.buffer ? 'buffer' : 'idle';
    }

    /* -------------------------------------------------------------- analysis */

    /** True while there is audio to analyse, whichever mode we are in. */
    get listening() {
        return this.mode === 'stream' || (this.mode === 'buffer' && this.playing);
    }

    /**
     * Average amplitude of the bass bins, 0-255. This is the single value the
     * whole visualization is driven from.
     */
    getBassAverage() {
        this.analyser.getByteFrequencyData(this.frequencyData);

        var sum = 0;
        for (var i = 0; i < BASS_BIN_COUNT; i++) {
            sum += this.frequencyData[i];
        }

        return sum / BASS_BIN_COUNT;
    }
}

/**
 * Ask for this tab's audio. Chromium-based browsers can share tab audio;
 * Firefox and Safari cannot, and reject or return a video-only stream.
 */
export async function captureTabAudio() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('This browser cannot capture tab audio. Try Chrome, or use a file.');
    }

    var stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,           // required: no browser allows an audio-only capture
        audio: true,
        preferCurrentTab: true
    });

    // The picture is not wanted, only the sound.
    stream.getVideoTracks().forEach(function (track) { track.stop(); });

    if (stream.getAudioTracks().length === 0) {
        throw new Error('No audio was shared. Pick this tab and tick "Share tab audio".');
    }

    return stream;
}

export async function captureMicrophone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('This browser cannot use the microphone.');
    }

    return navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
}
