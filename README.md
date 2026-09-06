# Audio visualizer

A cloud of ~440 particles that morphs between a sphere, a box and a heart in
time with the bass of the track, drawn on an HTML `<canvas>`.

Live: https://audio-visualizer.pages.dev

## How it works

- `js/audio.js` — decodes the track with the Web Audio API and exposes an
  average of the bass frequency bins.
- `js/renderer.js` — rotates the point cloud and projects it onto a 2D canvas
  with a pinhole camera.
- `js/shapes.js` — the three vertex clouds the particles morph between.
- `js/tween.js` — the tween engine driving the morphs and colour changes.
- `js/app.js` — wires them together and picks a shape from the bass level.

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

The site is hosted on Cloudflare Pages.

```
npx wrangler login     # once
npm run deploy
```

`npm run deploy` builds `dist/` and uploads it to the `audio-visualizer` Pages
project. In CI, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` instead
of logging in.
