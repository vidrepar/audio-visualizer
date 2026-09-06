/**
 * Minimal tween engine, replacing TweenLite.
 *
 * Like TweenLite's default overwrite behaviour, starting a tween on an object
 * that is already tweening replaces the running one. The visualizer leans on
 * that: it re-issues a morph on every frame the bass stays in range, so each
 * frame's tween has to supersede the last rather than stack with it.
 */

var tweens = new Map();

function easeOutQuad(t) {
    return t * (2 - t);
}

/**
 * Tween the numeric properties of `target` towards `props` over `duration`
 * seconds. Returns nothing; progress is applied in place by `updateTweens`.
 */
export function tweenTo(target, duration, props, onComplete) {
    var from = {};
    var keys = Object.keys(props);

    for (var i = 0; i < keys.length; i++) {
        from[keys[i]] = target[keys[i]];
    }

    tweens.set(target, {
        target: target,
        from: from,
        to: props,
        keys: keys,
        duration: duration,
        elapsed: 0,
        onComplete: onComplete
    });
}

/** Advance every running tween by `delta` seconds. */
export function updateTweens(delta) {
    tweens.forEach(function (tween, target) {
        tween.elapsed += delta;

        var progress = tween.duration > 0 ? Math.min(tween.elapsed / tween.duration, 1) : 1;
        var eased = easeOutQuad(progress);

        for (var i = 0; i < tween.keys.length; i++) {
            var key = tween.keys[i];
            tween.target[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * eased;
        }

        if (progress === 1) {
            tweens.delete(target);
            if (tween.onComplete) tween.onComplete();
        }
    });
}

/** Drop every running tween, e.g. when the scene is torn down. */
export function clearTweens() {
    tweens.clear();
}
