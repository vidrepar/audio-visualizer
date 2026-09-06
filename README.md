# Audio visualizer

A cloud of ~440 particles that morphs between a sphere, a box and a heart
according to how much bass the music is putting out, and pulses on the beat.
Drawn on an HTML `<canvas>`.

Live: https://audio-visualizer.pages.dev

## Playing something

Four ways in:

- **The demo track**, loaded on arrival.
- **An audio file** from your machine — *open a file*.
- **A YouTube link** — paste it and press *load*.
- **Anything else you can hear** — *hear the room* listens through the
  microphone.

### Why YouTube needs one extra click

A YouTube video plays inside a cross-origin iframe, and a page cannot read the
audio out of one. Extracting the audio server-side would break YouTube's terms
and needs a backend this static site does not have.

So the page listens instead. Press *hear this tab*, pick this tab and tick
*share tab audio*, and the visualizer analyses the sound as it plays. Nothing is
fetched, downloaded or decoded from YouTube — the embedded player is the only
thing touching it, and it stays in charge of playback.

Tab audio capture is a Chromium feature. In Firefox and Safari, use *hear the
room* or open a file instead.

## How it works

- `js/audio.js` — plays decoded audio, or taps a live capture stream, and
  averages the bass bins of an `AnalyserNode`.
- `js/analysis.js` — scales that reading against how loud the input has been
  lately, so the visuals fit any track rather than one tuned-for song, and picks
  a shape and a beat from it.
- `js/renderer.js` — rotates the point cloud and projects it onto a 2D canvas
  with a pinhole camera.
- `js/youtube.js` — the IFrame Player API wrapper, used purely as a transport.
- `js/shapes.js` — the three vertex clouds the particles morph between.
- `js/tween.js` — the tween engine driving the morphs and colour changes.
- `js/app.js` — wires it together.

There is no bundler or transpiler: the browser loads the ES modules directly.

## Develop

```
npm start
```

Serves the project at http://localhost:3010.

## Build

```
npm run build
```

Copies the deployable files into `dist/`.

## Deploy

The site is hosted on Cloudflare Pages, which reads its project name and
output directory from `wrangler.toml`.

Connect the repository to a Pages project in the Cloudflare dashboard with
build command `npm run build` and output directory `dist`, and every push
deploys itself.

To deploy from your machine instead:

```
npm install
npx wrangler login     # once
npm run deploy
```

In CI, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` instead of
logging in.
