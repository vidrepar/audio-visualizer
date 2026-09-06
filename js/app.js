/**
 * Audio visualizer.
 *
 * Paste a YouTube link and a cloud of particles morphs between a sphere, a box
 * and a heart according to how much bass the track is putting out, pulsing on
 * the beat.
 *
 * A cross-origin YouTube iframe never exposes its audio, so the page listens to
 * captured tab audio instead of reading the player. That request has to be made
 * while the visitor's click is still live, which is why submitting the link
 * fires it off before anything is awaited.
 */

import { SHAPES } from './shapes.js';
import { AudioEngine, captureTabAudio, captureMicrophone } from './audio.js';
import { ParticleRenderer } from './renderer.js';
import { BassTracker } from './analysis.js';
import { YouTubePlayer, parseVideoId, preloadApi } from './youtube.js';
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

// With nothing playing the cloud is a backdrop and draws itself small, so the
// one thing on screen to act on is the link field. It grows into the room once
// there is music.
var BACKDROP_SCALE = 0.5;
var PRESENCE_EASE = 1.4; // per second

var SHARE_PROMPT = 'Pick this tab, tick "Share tab audio", and share.';

var app = {

    engine: null,
    tracker: null,
    renderer: null,
    youtube: null,

    // 'idle' until something is loaded, then 'youtube' or 'track' (the demo or
    // a file), which is what the play button and progress bar follow.
    mode: 'idle',

    particles: [],
    rotation: { x: 0, y: 0, z: 0 },
    color: { r: 25, g: 100, b: 180 },
    swell: 1,
    presence: BACKDROP_SCALE,

    elements: {},
    lastFrameTime: 0,

    init: function () {
        app.elements = {
            canvas: document.getElementById('scene'),
            progress: document.getElementById('progress'),
            playToggle: document.getElementById('play-toggle'),
            launcher: document.getElementById('launcher'),
            urlForm: document.getElementById('url-form'),
            urlInput: document.getElementById('url-input'),
            nowPlaying: document.getElementById('now-playing'),
            message: document.getElementById('message'),
            enableAudio: document.getElementById('enable-audio'),
            useMic: document.getElementById('use-mic'),
            useDemo: document.getElementById('use-demo'),
            fileInput: document.getElementById('file-input'),
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

        // Fetched now so that creating a player later is quick enough to happen
        // inside the click that asks for tab audio.
        preloadApi();
    },

    bindEvents: function () {
        window.addEventListener('resize', function () {
            app.renderer.resize();
        });

        app.elements.urlForm.addEventListener('submit', app.onUrlSubmit);
        app.elements.playToggle.addEventListener('click', app.togglePlayback);
        app.elements.useDemo.addEventListener('click', app.useDemo);
        app.elements.fileInput.addEventListener('change', app.onFileChosen);
        app.elements.enableAudio.addEventListener('click', app.onEnableAudio);
        app.elements.useMic.addEventListener('click', app.onUseMicrophone);
    },

    /* ----------------------------------------------------------- youtube flow */

    onUrlSubmit: async function (event) {
        event.preventDefault();

        var videoId = parseVideoId(app.elements.urlInput.value);

        if (!videoId) {
            app.setMessage('That does not look like a YouTube link.');
            return;
        }

        // Both of these start now: the capture request has to be made while the
        // submit is still a live user gesture, and the video may as well load
        // behind the browser's sharing prompt.
        var alreadyListening = app.engine.mode === 'stream';
        var capturing = alreadyListening ? Promise.resolve(true) : app.requestTabAudio();
        var loading = app.loadVideo(videoId).then(function () { return null; },
            function (error) { return error; });

        app.setMessage(alreadyListening ? 'Loading the video...' : SHARE_PROMPT);
        app.elements.urlInput.blur();

        var listening = await capturing;
        app.setMessage('Loading the video...');

        var failure = await loading;
        if (failure) {
            app.setMessage(failure.message);
            console.error(failure);
            return;
        }

        app.engine.pause();
        app.elements.youtubeHost.hidden = false;

        // Emptied so the field reads as an invitation for the next link rather
        // than a record of the last one.
        app.elements.urlInput.value = '';

        app.enter('youtube', 'YouTube video');
        app.youtube.play();

        app.setMessage(listening ? '' : 'Playing, but it cannot hear the video yet.');
    },

    loadVideo: async function (videoId) {
        if (!app.youtube) {
            app.youtube = new YouTubePlayer(app.elements.youtubeHost);
            app.youtube.onStateChange = app.onYouTubeStateChange;
        }

        await app.youtube.load(videoId);
    },

    /* -------------------------------------------------------------- listening */

    /**
     * Ask for this tab's audio. Called synchronously from a click so the
     * request still carries the visitor's gesture; resolves to whether the
     * visualizer ended up with something to listen to.
     */
    requestTabAudio: function () {
        return captureTabAudio()
            .then(function (stream) { return app.listenTo(stream); })
            .catch(function (error) { return app.onCaptureFailed(error); });
    },

    listenTo: async function (stream) {
        await app.engine.attachStream(stream);

        app.tracker.reset();
        app.elements.enableAudio.hidden = true;
        app.elements.useMic.hidden = true;
        app.updatePlayButton();

        return true;
    },

    onCaptureFailed: function (error) {
        // Dismissing the browser's own prompt is a choice, not a fault.
        var dismissed = error.name === 'NotAllowedError';

        // Firefox and Safari can share a tab but not its sound.
        app.elements.useMic.hidden = dismissed;
        app.elements.enableAudio.hidden = false;

        if (!dismissed) console.warn(error);

        return false;
    },

    onEnableAudio: function () {
        app.setMessage(SHARE_PROMPT);

        app.requestTabAudio().then(function (listening) {
            app.setMessage(listening ? '' : 'Still not hearing anything.');
        });
    },

    onUseMicrophone: function () {
        captureMicrophone()
            .then(function (stream) { return app.listenTo(stream); })
            .then(function () { app.setMessage(''); })
            .catch(function (error) { app.setMessage(error.message); });
    },

    /* ------------------------------------------------------- files and demo */

    useDemo: async function () {
        app.setMessage('Loading the demo track...');

        try {
            await app.engine.loadUrl(DEMO_URL);
        } catch (error) {
            app.setMessage('The demo track could not be loaded.');
            console.error(error);
            return;
        }

        app.startTrack(DEMO_TITLE);
    },

    onFileChosen: async function (event) {
        var file = event.target.files[0];
        if (!file) return;

        app.setMessage('Reading ' + file.name + '...');

        try {
            await app.engine.loadFile(file);
        } catch (error) {
            app.setMessage('That file could not be decoded.');
            console.error(error);
            return;
        }

        app.startTrack(file.name);
    },

    /** Take over playback for a decoded track, putting any video aside. */
    startTrack: async function (title) {
        if (app.youtube) app.youtube.pause();
        app.elements.youtubeHost.hidden = true;

        // A live capture would drown out a track this page is playing itself.
        app.engine.detachStream();
        app.elements.enableAudio.hidden = true;
        app.elements.useMic.hidden = true;

        app.enter('track', title);
        app.setMessage('');

        await app.engine.play();
        app.updatePlayButton();
    },

    /* ---------------------------------------------------------- presentation */

    /** Move into a playing state: the launcher steps aside and names the track. */
    enter: function (mode, title) {
        app.mode = mode;
        app.tracker.reset();

        app.elements.launcher.classList.add('is-compact');
        app.elements.urlInput.placeholder = 'paste another link';

        app.setTitle(title);

        app.elements.progress.value = 0;
        app.elements.progress.max = app.duration || 1;

        app.updatePlayButton();
    },

    setTitle: function (title) {
        app.title = title;
        app.elements.nowPlaying.textContent = title;
        app.elements.nowPlaying.hidden = !title;
    },

    setMessage: function (message) {
        app.elements.message.textContent = message;
        app.elements.message.hidden = message === '';
    },

    updatePlayButton: function () {
        // A video carries its own controls, so this page only shows a play
        // button for tracks it is playing itself.
        var owned = app.mode === 'track' && app.engine.mode === 'buffer';

        app.elements.playToggle.hidden = !owned;
        if (!owned) return;

        var playing = app.engine.playing;
        app.elements.playToggle.classList.toggle('icon-pause', playing);
        app.elements.playToggle.classList.toggle('icon-play', !playing);
        app.elements.playToggle.setAttribute('aria-label', playing ? 'Pause' : 'Play');
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
        if (app.mode !== 'track' || !app.engine.buffer) return;

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
        var duration = app.youtube.duration;
        if (duration) app.elements.progress.max = duration;

        app.refreshTitle();
    },

    onTrackEnded: function () {
        app.morphTo('heart');
        app.updatePlayButton();
    },

    /** The player reports its title asynchronously, and again per video. */
    refreshTitle: function () {
        if (app.mode !== 'youtube' || !app.youtube) return;

        var title = app.youtube.title;
        if (title && title !== app.title) app.setTitle(title);
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

        var target = app.mode === 'idle' ? BACKDROP_SCALE : 1;
        app.presence += (target - app.presence) * Math.min(PRESENCE_EASE * delta, 1);

        app.updateProgress();
        updateTweens(delta);

        app.renderer.render(app.particles, app.rotation, rgbToCss(app.color), app.swell * app.presence);
    },

    updateProgress: function () {
        app.refreshTitle();

        if (app.mode === 'idle') return;

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
