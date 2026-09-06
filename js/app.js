/**
 * Audio visualizer.
 *
 * A cloud of particles morphs between a sphere, a box and a heart according to
 * how much bass the music is putting out, and pulses on the beat. The music can
 * be the demo track, an audio file, or a YouTube video the visitor pastes in.
 *
 * A cross-origin YouTube iframe never exposes its audio, so for a YouTube video
 * the page listens to captured tab audio instead of reading the player. That is
 * also why nothing here has to fetch, download or decode anything from YouTube.
 */

import { SHAPES } from './shapes.js';
import { AudioEngine, captureTabAudio, captureMicrophone } from './audio.js';
import { ParticleRenderer } from './renderer.js';
import { BassTracker } from './analysis.js';
import { YouTubePlayer, parseVideoId } from './youtube.js';
import { tweenTo, updateTweens } from './tween.js';

var DEMO_URL = 'assets/audio/song.mp3';
var DEMO_TITLE = 'Riptide - Vance Joy';
var BACKGROUND = '#ff717e';

var COLORS = [
    { r: 255, g: 255, b: 255 },
    { r: 206, g: 51, b: 51 },
    { r: 0, g: 0, b: 255 },
    { r: 0, g: 0, b: 0 }
];

var COLOR_INTERVAL = 2000; // ms between colour changes

// Where each shape settles, carried over from the original visualizer.
var POSES = {
    sphere: { rotation: { x: 1, y: 1, z: 1 }, duration: 2 },
    heart: { rotation: { x: -0.4, y: 0.2, z: 0 }, duration: 3 },
    box: { rotation: { x: 10, y: 10, z: 10 }, duration: 20 }
};

var BEAT_SWELL = 0.16;   // how far a beat pushes the cloud outwards
var IDLE_SPIN = 0.06;    // radians per second while nothing is playing

var app = {

    engine: null,
    tracker: null,
    renderer: null,
    youtube: null,

    // 'track' while playing a decoded buffer, 'youtube' while a video is loaded.
    mode: 'track',
    trackTitle: DEMO_TITLE,

    particles: [],
    rotation: { x: 0, y: 0, z: 0 },
    color: { r: 25, g: 100, b: 180 },
    swell: 1,

    elements: {},
    lastFrameTime: 0,

    init: function () {
        app.elements = {
            canvas: document.getElementById('scene'),
            progress: document.getElementById('progress'),
            playToggle: document.getElementById('play-toggle'),
            status: document.getElementById('status'),
            nowPlaying: document.getElementById('now-playing'),
            listening: document.getElementById('listening'),
            urlForm: document.getElementById('url-form'),
            urlInput: document.getElementById('url-input'),
            fileInput: document.getElementById('file-input'),
            captureTab: document.getElementById('capture-tab'),
            captureMic: document.getElementById('capture-mic'),
            stopListening: document.getElementById('stop-listening'),
            youtubeHost: document.getElementById('youtube-host')
        };

        app.renderer = new ParticleRenderer(app.elements.canvas, BACKGROUND);
        app.tracker = new BassTracker();
        app.engine = new AudioEngine();
        app.engine.onEnded = app.onTrackEnded;

        app.createParticles();
        app.bindEvents();

        app.lastFrameTime = performance.now();
        requestAnimationFrame(app.animate);

        setInterval(app.animateColor, COLOR_INTERVAL);

        app.loadDemo();
    },

    bindEvents: function () {
        window.addEventListener('resize', function () {
            app.renderer.resize();
        });

        app.elements.playToggle.addEventListener('click', app.togglePlayback);
        app.elements.urlForm.addEventListener('submit', app.onUrlSubmit);
        app.elements.fileInput.addEventListener('change', app.onFileChosen);
        app.elements.captureTab.addEventListener('click', function () {
            app.startListening(captureTabAudio, 'this tab');
        });
        app.elements.captureMic.addEventListener('click', function () {
            app.startListening(captureMicrophone, 'microphone');
        });
        app.elements.stopListening.addEventListener('click', app.stopListening);
    },

    /* ------------------------------------------------------------------ input */

    loadDemo: async function () {
        app.setStatus('Loading the demo track...');

        try {
            await app.engine.loadUrl(DEMO_URL);
        } catch (error) {
            app.setStatus('Could not load the demo track. Paste a YouTube link or pick a file.');
            console.error(error);
            return;
        }

        app.setTrack('track', DEMO_TITLE);
        app.setStatus('');
    },

    onUrlSubmit: async function (event) {
        event.preventDefault();

        var videoId = parseVideoId(app.elements.urlInput.value);

        if (!videoId) {
            app.setStatus('That does not look like a YouTube link.');
            return;
        }

        app.setStatus('Loading the video...');
        app.elements.urlInput.blur();

        try {
            if (!app.youtube) {
                app.youtube = new YouTubePlayer(app.elements.youtubeHost);
                app.youtube.onStateChange = app.onYouTubeStateChange;
            }

            await app.youtube.load(videoId);
        } catch (error) {
            app.setStatus(error.message);
            console.error(error);
            return;
        }

        app.engine.pause();
        app.elements.youtubeHost.hidden = false;
        app.setTrack('youtube', 'YouTube video');

        app.setStatus(app.engine.mode === 'stream'
            ? 'Press play.'
            : 'Press play, then "hear this tab" so the visuals can listen.');
    },

    onFileChosen: async function (event) {
        var file = event.target.files[0];
        if (!file) return;

        app.setStatus('Reading ' + file.name + '...');

        try {
            await app.engine.loadFile(file);
        } catch (error) {
            app.setStatus('That file could not be decoded.');
            console.error(error);
            return;
        }

        app.hideYouTube();
        app.setTrack('track', file.name);
        app.setStatus('');
        app.togglePlayback();
    },

    setTrack: function (mode, title) {
        app.mode = mode;
        app.trackTitle = title;
        app.tracker.reset();

        app.elements.nowPlaying.textContent = title;
        app.elements.playToggle.disabled = false;
        app.elements.progress.value = 0;
        app.elements.progress.max = app.duration || 1;

        app.updatePlayButton();
    },

    hideYouTube: function () {
        if (!app.youtube) return;

        app.youtube.pause();
        app.elements.youtubeHost.hidden = true;
    },

    /* -------------------------------------------------------------- listening */

    startListening: async function (capture, label) {
        try {
            var stream = await capture();
            await app.engine.attachStream(stream);
        } catch (error) {
            // A visitor dismissing the browser's own picker is not an error.
            app.setStatus(error.name === 'NotAllowedError' ? '' : error.message);
            return;
        }

        app.tracker.reset();
        app.setStatus('');
        app.updateListeningLabel(label);
        app.updatePlayButton();
    },

    stopListening: function () {
        app.engine.detachStream();
        app.tracker.reset();
        app.updateListeningLabel(null);
        app.updatePlayButton();
    },

    updateListeningLabel: function (label) {
        var listening = app.engine.mode === 'stream';

        app.elements.listening.textContent = listening ? 'listening to ' + label : '';
        app.elements.listening.hidden = !listening;
        app.elements.stopListening.hidden = !listening;
    },

    /* -------------------------------------------------------------- transport */

    get playing() {
        return app.mode === 'youtube'
            ? Boolean(app.youtube && app.youtube.playing)
            : app.engine.playing;
    },

    get currentTime() {
        return app.mode === 'youtube'
            ? (app.youtube ? app.youtube.currentTime : 0)
            : app.engine.currentTime;
    },

    get duration() {
        return app.mode === 'youtube'
            ? (app.youtube ? app.youtube.duration : 0)
            : app.engine.duration;
    },

    togglePlayback: async function () {
        if (app.mode === 'youtube') {
            if (!app.youtube) return;

            if (app.youtube.playing) app.youtube.pause();
            else app.youtube.play();

            // The player reports back through onStateChange.
            return;
        }

        if (!app.engine.buffer) return;

        if (app.engine.playing) {
            app.engine.pause();
            app.morphTo('heart');
        } else {
            // Starting is asynchronous: the audio context has to come out of
            // suspension first, so the button is updated once it is running.
            await app.engine.play();
        }

        app.updatePlayButton();
    },

    onYouTubeStateChange: function () {
        app.updatePlayButton();

        var duration = app.youtube.duration;
        if (duration) app.elements.progress.max = duration;

        app.refreshTitle();
    },

    onTrackEnded: function () {
        app.morphTo('heart');
        app.updatePlayButton();
    },

    updatePlayButton: function () {
        var playing = app.playing;

        // While a live stream is the input, playback belongs to whatever is
        // making the sound; there is nothing here for the button to control.
        var listeningToStream = app.mode === 'track' && app.engine.mode === 'stream';

        app.elements.playToggle.disabled = listeningToStream ||
            (app.mode === 'track' && !app.engine.buffer);

        app.elements.playToggle.classList.toggle('icon-pause', playing);
        app.elements.playToggle.classList.toggle('icon-play', !playing);
        app.elements.playToggle.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    },

    setStatus: function (message) {
        app.elements.status.textContent = message;
        app.elements.status.hidden = message === '';
    },

    /* --------------------------------------------------------------- visuals */

    /** Seed the cloud from the sphere, jittered so it does not look stamped out. */
    createParticles: function () {
        app.particles = SHAPES.sphere.map(function (vertex) {
            return {
                x: vertex[0] + Math.random() * 4 - 2,
                y: vertex[1] + Math.random() * 4 - 2,
                z: vertex[2]
            };
        });
    },

    /**
     * Send every particle towards the matching vertex of `shape` and turn the
     * cloud towards that shape's pose. Re-issuing this every frame is what
     * gives the cloud its constant drift: each tween supersedes the last, so
     * the particles are always easing towards the target without arriving.
     */
    morphTo: function (shape) {
        var vertices = SHAPES[shape];
        var pose = POSES[shape];

        for (var i = 0; i < app.particles.length; i++) {
            var vertex = vertices[i];
            tweenTo(app.particles[i], 1, { x: vertex[0], y: vertex[1], z: vertex[2] });
        }

        tweenTo(app.rotation, pose.duration, pose.rotation);
    },

    animateColor: function () {
        var color = COLORS[Math.floor(Math.random() * COLORS.length)];
        tweenTo(app.color, 2, { r: color.r, g: color.g, b: color.b });
    },

    animate: function (now) {
        requestAnimationFrame(app.animate);

        // Clamped so a backgrounded tab does not resume with one huge step.
        var delta = Math.min((now - app.lastFrameTime) / 1000, 0.1);
        app.lastFrameTime = now;

        if (app.engine.listening) {
            var reading = app.tracker.update(app.engine.getBassAverage(), delta);
            app.morphTo(reading.shape);
            app.swell = 1 + reading.pulse * BEAT_SWELL;
        } else {
            // Nothing to react to: drift, so the scene never looks frozen.
            app.rotation.y += IDLE_SPIN * delta;
            app.swell += (1 - app.swell) * 0.1;
        }

        app.updateProgress();
        updateTweens(delta);

        app.renderer.render(app.particles, app.rotation, rgbToCss(app.color), app.swell);
    },

    refreshTitle: function () {
        if (app.mode !== 'youtube' || !app.youtube) return;

        var title = app.youtube.title;
        if (title && title !== app.trackTitle) {
            app.trackTitle = title;
            app.elements.nowPlaying.textContent = title;
        }
    },

    updateProgress: function () {
        app.refreshTitle();

        if (app.mode === 'track' && app.engine.mode === 'stream') {
            app.elements.progress.value = 0;
            return;
        }

        if (!app.playing) return;

        var duration = app.duration;
        if (duration) app.elements.progress.max = duration;

        app.elements.progress.value = app.currentTime;
    }
};

function rgbToCss(color) {
    return 'rgb(' + Math.round(color.r) + ',' + Math.round(color.g) + ',' + Math.round(color.b) + ')';
}

app.init();
