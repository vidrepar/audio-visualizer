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
import { search } from './catalog.js';

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

// How fast the cloud grows into a beat and how fast it comes back down, as
// half-lives in seconds. The swell used to be assigned straight from the beat
// pulse, which meant it jumped the full distance in a single frame - a jolt,
// not a swell - and then fell on the pulse's own linear ramp. Attack and
// release are separate because a beat should arrive faster than it leaves:
// equal rates read as a wobble rather than a hit.
var SWELL_ATTACK = 0.045;
var SWELL_RELEASE = 0.20;
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
    // The shape the particles are currently tweening towards. Kept so a morph is
    // issued when the shape CHANGES rather than on every frame.
    shape: null,
    presence: BACKDROP_SCALE,

    elements: {},
    // Set when a catalogue row was picked, so the header can name the track
    // before YouTube reports its own title.
    pendingTitle: null,
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
            suggestions: document.getElementById('suggestions'),
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
        app.elements.urlInput.addEventListener('input', app.onSearchInput);
        app.elements.urlInput.addEventListener('focus', app.onSearchInput);
        app.elements.urlInput.addEventListener('keydown', app.onSearchKey);
        app.elements.suggestions.addEventListener('mousedown', app.onSuggestionPick);
        /* Closing on blur has to wait a tick, or the mousedown that picked a row
           is cancelled by the list disappearing under the cursor first. */
        app.elements.urlInput.addEventListener('blur', function () {
            setTimeout(app.closeSuggestions, 120);
        });
        app.elements.playToggle.addEventListener('click', app.togglePlayback);
        app.elements.useDemo.addEventListener('click', app.useDemo);
        app.elements.fileInput.addEventListener('change', app.onFileChosen);
        app.elements.enableAudio.addEventListener('click', app.onEnableAudio);
        app.elements.useMic.addEventListener('click', app.onUseMicrophone);
    },

    /* ------------------------------------------------------------ the picker */

    // How many rows the list shows. Enough to scan without becoming a page.
    SUGGESTION_LIMIT: 8,

    suggestionIndex: -1,
    suggestionRows: [],

    /**
     * Re-run the search on every keystroke.
     *
     * A pasted LINK is not a search: the moment the field holds something that
     * parses as a video id, the list gets out of the way rather than offering
     * eight songs whose titles happen to share letters with a URL.
     */
    onSearchInput: function () {
        var value = app.elements.urlInput.value;

        if (parseVideoId(value)) return app.closeSuggestions();

        app.suggestionRows = search(value, app.SUGGESTION_LIMIT);
        app.suggestionIndex = app.suggestionRows.length ? 0 : -1;
        app.renderSuggestions();
    },

    renderSuggestions: function () {
        var list = app.elements.suggestions;
        list.innerHTML = '';

        if (!app.suggestionRows.length) {
            var empty = document.createElement('li');
            empty.className = 'empty';
            empty.textContent = 'Nothing matches - paste a link instead.';
            list.appendChild(empty);
        } else {
            for (var i = 0; i < app.suggestionRows.length; i++) {
                var entry = app.suggestionRows[i];
                var row = document.createElement('li');
                row.setAttribute('role', 'option');
                row.setAttribute('aria-selected', String(i === app.suggestionIndex));
                row.dataset.index = String(i);

                var title = document.createElement('span');
                title.className = 'title';
                title.textContent = entry[1];

                var artist = document.createElement('span');
                artist.className = 'artist';
                artist.textContent = entry[2];

                row.appendChild(title);
                row.appendChild(artist);
                list.appendChild(row);
            }
        }

        list.hidden = false;
        app.elements.urlInput.setAttribute('aria-expanded', 'true');
        app.scrollSelectionIntoView();
    },

    closeSuggestions: function () {
        app.elements.suggestions.hidden = true;
        app.elements.urlInput.setAttribute('aria-expanded', 'false');
        app.suggestionIndex = -1;
    },

    /** Arrows move, Enter plays, Escape gets out. */
    onSearchKey: function (event) {
        if (app.elements.suggestions.hidden) return;

        if (event.key === 'Escape') {
            app.closeSuggestions();
            return;
        }

        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        if (!app.suggestionRows.length) return;

        event.preventDefault();

        var step = event.key === 'ArrowDown' ? 1 : -1;
        var count = app.suggestionRows.length;
        /* Wraps, because a list this short is a ring: pressing up on the first
           row to reach the last is faster than eight presses down. */
        app.suggestionIndex = (app.suggestionIndex + step + count) % count;
        app.renderSuggestions();
    },

    onSuggestionPick: function (event) {
        var row = event.target.closest('li[data-index]');
        if (!row) return;
        /* mousedown, not click, and prevented: the input must not lose focus
           before the pick is handled. */
        event.preventDefault();
        app.playEntry(app.suggestionRows[Number(row.dataset.index)]);
    },

    scrollSelectionIntoView: function () {
        var selected = app.elements.suggestions.querySelector('[aria-selected="true"]');
        if (selected) selected.scrollIntoView({ block: 'nearest' });
    },

    /** Put a catalogue entry in the field and load it, as if it had been pasted. */
    playEntry: function (entry) {
        if (!entry) return;
        app.closeSuggestions();
        app.elements.urlInput.value = 'https://www.youtube.com/watch?v=' + entry[0];
        app.pendingTitle = entry[1] + ' - ' + entry[2];
        app.elements.urlForm.requestSubmit();
    },

    /* ----------------------------------------------------------- youtube flow */

    onUrlSubmit: async function (event) {
        event.preventDefault();

        /* Enter on a highlighted row plays that row. Typing "bohemian" and
           pressing Enter should start the song, not report that it is not a
           link - the field is a search box first and a URL box second. */
        if (!app.elements.suggestions.hidden && app.suggestionIndex >= 0) {
            return app.playEntry(app.suggestionRows[app.suggestionIndex]);
        }

        var videoId = parseVideoId(app.elements.urlInput.value);

        if (!videoId) {
            app.setMessage('That does not look like a YouTube link.');
            return;
        }

        app.closeSuggestions();

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

        app.enter('youtube', app.pendingTitle || 'YouTube video');
        app.pendingTitle = null;
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
        app.elements.urlInput.placeholder = 'search or paste another link';

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
     * cloud towards that shape's pose.
     *
     * Issued only when the shape CHANGES. It used to run every frame, and
     * because starting a tween replaces the running one, every frame restarted
     * the ease from wherever the particle had got to - so the cloud crawled at
     * a constant fraction of the remaining distance and never actually settled.
     * That is the mush: an ease-out that is perpetually in its first frame has
     * no ease in it at all. Letting one tween finish is what puts the arrival
     * back, and it also stops rebuilding a tween for every particle 60 times a
     * second.
     */
    morphTo: function (shape) {
        if (shape === app.shape) return;
        app.shape = shape;

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

        var swellTarget = 1;

        if (app.engine.listening) {
            var reading = app.tracker.update(app.engine.getBassAverage(), delta);
            app.morphTo(reading.shape);
            swellTarget = 1 + reading.pulse * BEAT_SWELL;
        } else {
            // Nothing to react to: drift, so the scene never looks frozen.
            app.rotation.y += IDLE_SPIN * delta;
        }

        // Chase the target rather than snapping to it, and chase it faster on
        // the way up than on the way down - see SWELL_ATTACK / SWELL_RELEASE.
        var halfLife = swellTarget > app.swell ? SWELL_ATTACK : SWELL_RELEASE;
        app.swell += (swellTarget - app.swell) * (1 - Math.pow(0.5, delta / halfLife));

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
