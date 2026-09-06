/**
 * Particle renderer on a plain 2D canvas, replacing THREE.CanvasRenderer.
 *
 * The particles live in a 3D point cloud that is rotated as a group and then
 * projected onto the canvas with a pinhole camera sitting on the +z axis, which
 * is all the three.js perspective camera was doing for this scene.
 */

var FIELD_OF_VIEW = 75;   // degrees, vertical
var CAMERA_Z = 75;
var GROUP_SCALE = 1.5;
var PARTICLE_RADIUS = 0.3; // world units

export class ParticleRenderer {

    constructor(canvas, background) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.background = background;

        this.width = 0;
        this.height = 0;
        this.focalLength = 0;

        this.resize();
    }

    /** Match the canvas to the viewport, accounting for the device pixel ratio. */
    resize() {
        var ratio = window.devicePixelRatio || 1;

        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.canvas.width = Math.round(this.width * ratio);
        this.canvas.height = Math.round(this.height * ratio);
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';

        this.context.setTransform(ratio, 0, 0, ratio, 0, 0);

        // Distance at which one world unit covers one pixel.
        this.focalLength = (this.height / 2) / Math.tan((FIELD_OF_VIEW / 2) * Math.PI / 180);
    }

    /**
     * Draw `particles` (objects with x/y/z) rotated by the Euler angles in
     * `rotation`, in the given CSS colour.
     */
    render(particles, rotation, color) {
        var ctx = this.context;

        ctx.fillStyle = this.background;
        ctx.fillRect(0, 0, this.width, this.height);

        // Rotation matrix for an XYZ Euler triple, matching three.js' ordering.
        var cosX = Math.cos(rotation.x), sinX = Math.sin(rotation.x);
        var cosY = Math.cos(rotation.y), sinY = Math.sin(rotation.y);
        var cosZ = Math.cos(rotation.z), sinZ = Math.sin(rotation.z);

        var m00 = cosY * cosZ;
        var m01 = -cosY * sinZ;
        var m02 = sinY;
        var m10 = cosX * sinZ + sinX * cosZ * sinY;
        var m11 = cosX * cosZ - sinX * sinZ * sinY;
        var m12 = -sinX * cosY;
        var m20 = sinX * sinZ - cosX * cosZ * sinY;
        var m21 = sinX * cosZ + cosX * sinZ * sinY;
        var m22 = cosX * cosY;

        var centerX = this.width / 2;
        var centerY = this.height / 2;

        // Every particle shares a colour, so the whole cloud is one path and
        // one fill — and depth ordering makes no visual difference.
        ctx.fillStyle = color;
        ctx.beginPath();

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];

            var x = (m00 * p.x + m01 * p.y + m02 * p.z) * GROUP_SCALE;
            var y = (m10 * p.x + m11 * p.y + m12 * p.z) * GROUP_SCALE;
            var z = (m20 * p.x + m21 * p.y + m22 * p.z) * GROUP_SCALE;

            var depth = CAMERA_Z - z;
            if (depth <= 1) continue; // at or behind the near plane

            var perspective = this.focalLength / depth;
            var screenX = centerX + x * perspective;
            var screenY = centerY - y * perspective;
            var radius = PARTICLE_RADIUS * perspective;

            if (radius < 0.1) continue;

            ctx.moveTo(screenX + radius, screenY);
            ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        }

        ctx.fill();
    }
}
