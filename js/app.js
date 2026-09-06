/**
 * Audio visualizer.
 *
 * A cloud of particles morphs between a sphere, a box and a heart depending on
 * how much bass the track is putting out, and drifts through a small palette of
 * colours. Everything is drawn on a 2D canvas.
 */

import { SHAPES } from './shapes.js';
import { AudioPlayer } from './audio.js';
import { ParticleRenderer } from './renderer.js';
import { tweenTo, updateTweens } from './tween.js';

var SONG_URL = 'assets/audio/song.mp3';
var BACKGROUND = '#ff717e';

var COLORS = [
    { r: 255, g: 255, b: 255 },
    { r: 206, g: 51, b: 51 },
    { r: 0, g: 0, b: 255 },
    { r: 0, g: 0, b: 0 }
];

var COLOR_INTERVAL = 2000; // ms between colour changes

var app = {

    player: null,
    renderer: null,

    particles: [],
    rotation: { x: 0, y: 0, z: 0 },
    color: { r: 25, g: 100, b: 180 },

    elements: {},
    lastFrameTime: 0,
    colorTimer: null,

    init: function () {
        app.elements = {
            canvas: document.getElementById('scene'),
            progress: document.getElementById('progress'),
            playToggle: document.getElementById('play-toggle'),
            status: document.getElementById('status')
        };

        app.renderer = new ParticleRenderer(app.elements.canvas, BACKGROUND);
        app.createParticles();

        window.addEventListener('resize', function () {
            app.renderer.resize();
        });

        app.elements.playToggle.addEventListener('click', app.togglePlayback);

        app.lastFrameTime = performance.now();
        requestAnimationFrame(app.animate);

        app.loadAudio();
    },

    loadAudio: async function () {
        app.player = new AudioPlayer();
        app.player.onEnded = app.onTrackEnded;

        try {
            await app.player.load(SONG_URL);
        } catch (error) {
            app.setStatus('Could not load the track.');
            console.error(error);
            return;
        }

        app.elements.progress.max = app.player.duration;
        app.elements.playToggle.disabled = false;
        app.setStatus('');

        app.colorTimer = setInterval(app.animateColor, COLOR_INTERVAL);
    },

    setStatus: function (message) {
        app.elements.status.textContent = message;
        app.elements.status.hidden = message === '';
    },

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

    togglePlayback: async function () {
        if (!app.player || !app.player.buffer) return;

        if (app.player.playing) {
            app.player.pause();
            app.morphTo('heart', 1, { x: -0.4, y: 0.2, z: 0 }, 3);
        } else {
            // Starting is asynchronous: the audio context has to come out of
            // suspension first, so the button is updated once it is running.
            await app.player.play();
        }

        app.updatePlayButton();
    },

    onTrackEnded: function () {
        app.morphTo('heart', 1, { x: -0.4, y: 0.2, z: 0 }, 3);
        app.updatePlayButton();
    },

    updatePlayButton: function () {
        var playing = app.player.playing;

        app.elements.playToggle.classList.toggle('icon-pause', playing);
        app.elements.playToggle.classList.toggle('icon-play', !playing);
        app.elements.playToggle.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    },

    /**
     * Send every particle towards the matching vertex of `shape` and turn the
     * cloud towards `rotation`.
     */
    morphTo: function (shape, duration, rotation, rotationDuration) {
        var vertices = SHAPES[shape];

        for (var i = 0; i < app.particles.length; i++) {
            var vertex = vertices[i];
            tweenTo(app.particles[i], duration, { x: vertex[0], y: vertex[1], z: vertex[2] });
        }

        tweenTo(app.rotation, rotationDuration, rotation);
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

        if (app.player && app.player.playing) {
            app.reactToBass(app.player.getBassAverage());
            app.elements.progress.value = app.player.currentTime;
        }

        updateTweens(delta);

        app.renderer.render(app.particles, app.rotation, rgbToCss(app.color));
    },

    /** Pick a shape from the current bass level. Thresholds are 0-255. */
    reactToBass: function (bass) {
        if (bass === 170 || bass === 185) {
            app.morphTo('sphere', 1, { x: 1, y: 1, z: 1 }, 2);
        } else if ((bass > 115 && bass < 170) || bass === 180) {
            app.morphTo('heart', 1, { x: -0.4, y: 0.2, z: 0 }, 3);
        } else if ((bass > 0 && bass < 115) || bass === 125 || bass === 135 || bass === 145) {
            app.morphTo('box', 1, { x: 10, y: 10, z: 10 }, 20);
        }
    }
};

function rgbToCss(color) {
    return 'rgb(' + Math.round(color.r) + ',' + Math.round(color.g) + ',' + Math.round(color.b) + ')';
}

app.init();
