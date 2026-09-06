/**
 * Turns raw bass readings into something the visuals can be driven from.
 *
 * The original app compared the bass average against fixed values tuned by ear
 * against one track. Any other song — quieter, louder, mastered differently,
 * heard through a microphone — would sit outside those numbers and the
 * particles would never move. So levels are normalised against a decaying peak
 * instead: what matters is how loud this moment is relative to how loud the
 * track has recently been.
 */

// Half-life, in seconds, of the loud and quiet envelopes the input is scaled
// between. Long enough to span a verse and a chorus, short enough to re-fit
// within a few seconds of a new track starting.
var ENVELOPE_HALF_LIFE = 6;

// Smallest gap between those envelopes that is treated as real dynamics; below
// it the input is flat or silent and there is nothing to normalise against.
var MIN_RANGE = 6;

// Below this the input is treated as silence rather than amplified noise.
var NOISE_FLOOR = 4;

// Smoothing half-lives, in seconds, for the fast and slow envelopes a beat is
// detected from.
var FAST_SMOOTHING = 0.06;
var SLOW_SMOOTHING = 1.2;

var BEAT_RATIO = 1.25;      // fast envelope must exceed the slow one by this
var BEAT_COOLDOWN = 0.16;   // seconds, so one hit is not counted repeatedly
var PULSE_DECAY = 3.5;      // how fast a beat's pulse falls away, per second

// Energy needed to climb to the next shape, and to fall back from it. The gap
// between the pairs is hysteresis: without it a level sitting on a boundary
// would flip the shape every frame.
var SHAPE_STEPS = [
    { shape: 'box' },
    { shape: 'heart', enter: 0.42, exit: 0.32 },
    { shape: 'sphere', enter: 0.74, exit: 0.62 }
];

// Shortest time a shape is held before another can take over.
var MIN_DWELL = 0.35;

export class BassTracker {

    constructor() {
        this.high = NOISE_FLOOR;
        this.low = 0;
        this.fast = 0;
        this.slow = 0;

        this.energy = 0;
        this.pulse = 0;

        this.shapeIndex = 0;
        this.heldFor = MIN_DWELL;
        this.sinceBeat = BEAT_COOLDOWN;
    }

    /**
     * Fold in this frame's bass reading (0-255) and return the current
     * `{ energy, pulse, shape }`, where energy and pulse run 0-1.
     */
    update(bass, delta) {
        // Track how loud and how quiet this input has been lately, and read the
        // current level as a position between the two. Fixed thresholds only
        // ever suit one track; this fits itself to whatever is playing, however
        // it was mastered and however it is being heard.
        var settle = smoothing(ENVELOPE_HALF_LIFE, delta);

        this.high = bass > this.high ? bass : this.high + (bass - this.high) * settle;
        this.low = bass < this.low ? bass : this.low + (bass - this.low) * settle;

        var range = this.high - this.low;

        this.energy = (bass <= NOISE_FLOOR || range < MIN_RANGE)
            ? 0
            : clamp((bass - this.low) / range);

        this.fast += (this.energy - this.fast) * smoothing(FAST_SMOOTHING, delta);
        this.slow += (this.energy - this.slow) * smoothing(SLOW_SMOOTHING, delta);

        this.sinceBeat += delta;
        this.pulse = Math.max(this.pulse - PULSE_DECAY * delta, 0);

        var isBeat = this.fast > this.slow * BEAT_RATIO &&
            this.energy > 0.25 &&
            this.sinceBeat >= BEAT_COOLDOWN;

        if (isBeat) {
            this.sinceBeat = 0;
            this.pulse = 1;
        }

        this.updateShape(delta);

        return { energy: this.energy, pulse: this.pulse, shape: this.shape, beat: isBeat };
    }

    get shape() {
        return SHAPE_STEPS[this.shapeIndex].shape;
    }

    updateShape(delta) {
        this.heldFor += delta;
        if (this.heldFor < MIN_DWELL) return;

        var next = this.shapeIndex;

        // The slow envelope decides, so a single spike does not change shape.
        var level = this.slow;

        if (this.shapeIndex < SHAPE_STEPS.length - 1 && level >= SHAPE_STEPS[this.shapeIndex + 1].enter) {
            next = this.shapeIndex + 1;
        } else if (this.shapeIndex > 0 && level < SHAPE_STEPS[this.shapeIndex].exit) {
            next = this.shapeIndex - 1;
        }

        if (next !== this.shapeIndex) {
            this.shapeIndex = next;
            this.heldFor = 0;
        }
    }

    /** Forget everything learned about the previous input. */
    reset() {
        this.high = NOISE_FLOOR;
        this.low = 0;
        this.fast = 0;
        this.slow = 0;
        this.energy = 0;
        this.pulse = 0;
        this.shapeIndex = 0;
        this.heldFor = MIN_DWELL;
    }
}

/** Frame-rate independent smoothing factor for a given half-life. */
function smoothing(halfLife, delta) {
    return 1 - Math.pow(0.5, delta / halfLife);
}

function clamp(value) {
    return value < 0 ? 0 : (value > 1 ? 1 : value);
}
