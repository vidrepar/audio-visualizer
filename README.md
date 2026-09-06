# Audio visualizer

A cloud of ~440 particles that morphs between a sphere, a box and a heart
according to how much bass the music is putting out, and pulses on the beat.
Drawn on an HTML `<canvas>`.

Live: https://audio-visualizer.pages.dev

## Using it

Paste a YouTube link, press Enter. The browser asks which tab to share — pick
this one, tick *Share tab audio* — and the video plays with the visuals moving
to it.

That sharing prompt is the one step that cannot be removed. A YouTube video
plays inside a cross-origin iframe, and a page cannot read the audio out of
one; extracting it server-side would break YouTube's terms and needs a backend
this static site does not have. So the page listens to the tab instead. Nothing
is fetched, downloaded or decoded from YouTube — the embedded player is the
only thing touching it, and it keeps its own controls.

The request is made from inside the keypress, because browsers only grant a
capture while the visitor's gesture is still live. That is why submitting the
link asks for sharing before it awaits anything.

Tab audio is a Chromium feature. Elsewhere, or if the prompt is dismissed, the
video still plays and the page offers to listen through the microphone instead.
Two quieter links cover the rest: a demo track, and any audio file from your
machine.

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
