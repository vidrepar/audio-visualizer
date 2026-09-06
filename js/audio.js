/**
 * Web Audio playback and frequency analysis, replacing Pizzicato.
 *
 * A decoded buffer is played through an AnalyserNode. Because an
 * AudioBufferSourceNode cannot be restarted, pause/resume works by recording
 * how far into the buffer we are and starting a fresh source from that offset.
 */

var FFT_SIZE = 8192;

// Bins covering roughly 0-540Hz at a 44.1/48kHz sample rate: sub-bass and bass.
var BASS_BIN_COUNT = 92;

export class AudioPlayer {

    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();

        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = FFT_SIZE;
        this.analyser.connect(this.context.destination);

        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

        this.buffer = null;
        this.source = null;
        this.playing = false;

        // Set while play() is waiting on the context, so a second click cannot
        // start a competing source.
        this.starting = false;

        // Seconds of the buffer already played, and the context clock reading
        // at which the current source started.
        this.offset = 0;
        this.startedAt = 0;

        this.onEnded = null;
    }

    /** Fetch and decode `url`. Resolves once the track is ready to play. */
    async load(url) {
        var response = await fetch(url);

        if (!response.ok) {
            throw new Error('Could not load ' + url + ' (HTTP ' + response.status + ')');
        }

        this.buffer = await this.context.decodeAudioData(await response.arrayBuffer());
    }

    get duration() {
        return this.buffer ? this.buffer.duration : 0;
    }

    /** Playback position in seconds. */
    get currentTime() {
        if (!this.playing) return this.offset;
        return Math.min(this.offset + (this.context.currentTime - this.startedAt), this.duration);
    }

    async play() {
        if (this.playing || this.starting || !this.buffer) return;

        this.starting = true;

        try {
            // Browsers start the context suspended until a user gesture.
            if (this.context.state === 'suspended') {
                await this.context.resume();
            }
        } finally {
            this.starting = false;
        }

        var source = this.context.createBufferSource();
        source.buffer = this.buffer;
        source.connect(this.analyser);

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

        return Math.floor(sum / BASS_BIN_COUNT);
    }
}
