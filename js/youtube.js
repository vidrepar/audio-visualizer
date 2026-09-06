/**
 * YouTube playback via the IFrame Player API.
 *
 * The player is only a transport: a cross-origin iframe gives no access to its
 * audio samples, so the visualizer hears the track through a capture stream
 * instead (see AudioEngine.attachStream). Nothing here downloads or extracts
 * anything from YouTube.
 */

var API_URL = 'https://www.youtube.com/iframe_api';

var apiPromise = null;

/**
 * Pull the video id out of anything a user is likely to paste: a watch URL, a
 * share link, an embed or shorts URL, or a bare id. Returns null if there is
 * no plausible id in there.
 */
export function parseVideoId(input) {
    var text = (input || '').trim();
    if (text === '') return null;

    // A bare id.
    if (/^[\w-]{11}$/.test(text)) return text;

    var url;
    try {
        url = new URL(text.includes('://') ? text : 'https://' + text);
    } catch (error) {
        return null;
    }

    var host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
        return validId(url.pathname.slice(1));
    }

    if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'music.youtube.com' &&
        host !== 'youtube-nocookie.com') {
        return null;
    }

    var fromQuery = url.searchParams.get('v');
    if (fromQuery) return validId(fromQuery);

    var match = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)/);
    return match ? validId(match[1]) : null;
}

function validId(candidate) {
    return /^[\w-]{11}$/.test(candidate) ? candidate : null;
}

/**
 * Start fetching the IFrame API early. Creating a player is then quick enough
 * to happen inside the visitor's click, which matters because asking for tab
 * audio needs that click to still be live.
 */
export function preloadApi() {
    loadApi().catch(function () {
        // Nothing to do yet; the failure is reported when a link is submitted.
    });
}

/** Load the IFrame API once, resolving when it is ready to construct players. */
function loadApi() {
    if (apiPromise) return apiPromise;

    apiPromise = new Promise(function (resolve, reject) {
        if (window.YT && window.YT.Player) {
            resolve(window.YT);
            return;
        }

        var timeout = setTimeout(function () {
            reject(new Error('The YouTube player did not load.'));
        }, 15000);

        window.onYouTubeIframeAPIReady = function () {
            clearTimeout(timeout);
            resolve(window.YT);
        };

        var script = document.createElement('script');
        script.src = API_URL;
        script.onerror = function () {
            clearTimeout(timeout);
            reject(new Error('The YouTube player could not be reached.'));
        };
        document.head.appendChild(script);
    });

    return apiPromise;
}

export class YouTubePlayer {

    constructor(container) {
        this.container = container;
        this.player = null;
        this.ready = false;
        this.onStateChange = null;
    }

    /** Load `videoId`, creating the underlying player on first use. */
    async load(videoId) {
        var YT = await loadApi();

        if (this.player) {
            this.player.loadVideoById(videoId);
            return;
        }

        await new Promise((resolve, reject) => {
            var host = document.createElement('div');
            this.container.appendChild(host);

            var settled = false;
            var timeout = setTimeout(function () {
                if (!settled) { settled = true; reject(new Error('The YouTube player did not start.')); }
            }, 15000);

            this.player = new YT.Player(host, {
                videoId: videoId,
                playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
                events: {
                    onReady: () => {
                        this.ready = true;
                        if (!settled) { settled = true; clearTimeout(timeout); resolve(); }
                    },
                    onError: () => {
                        if (!settled) {
                            settled = true;
                            clearTimeout(timeout);
                            reject(new Error('That video cannot be played here.'));
                        }
                    },
                    onStateChange: event => {
                        if (this.onStateChange) this.onStateChange(event.data);
                    }
                }
            });
        });
    }

    get playing() {
        return this.ready && this.player.getPlayerState() === 1; // YT.PlayerState.PLAYING
    }

    get currentTime() {
        return this.ready ? this.player.getCurrentTime() : 0;
    }

    get duration() {
        return this.ready ? this.player.getDuration() : 0;
    }

    get title() {
        if (!this.ready || !this.player.getVideoData) return '';
        var data = this.player.getVideoData();
        return data && data.title ? data.title : '';
    }

    play() {
        if (this.ready) this.player.playVideo();
    }

    pause() {
        if (this.ready) this.player.pauseVideo();
    }
}
