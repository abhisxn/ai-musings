# Stack — Threshold V2

## Delivery Format

Single HTML file (`threshold-v2.html`) — openable by double-clicking in any browser, no server needed.
Chosen because: zero deploy friction, shareable as a file, fits the "instrument you open" aesthetic.

If the experiment is later ported to the Next.js app (thatguyabhishek.com/musings/threshold), convert to a React component in `experiments/threshold/index.tsx`. Until then, stay single-file.

## Audio

Tone.js 14.8.49 — CDN. Reason: already familiar from other experiments, handles polyphony and scheduling cleanly.
CDN: `https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js`
Audio must init inside a user gesture (start button click). Never auto-play.

## Font

Share Tech Mono — Google Fonts CDN. The only external font. Everything else uses system monospace as fallback.

## Camera

`getUserMedia` — browser native. No external library. Mirror mode on by default (MIRROR = true).
Hidden canvas for pixel sampling (`willReadFrequently: true` mandatory for performance).
Grid: 36 columns × 22 rows = 792 cells.

## Rendering

Vanilla JS + DOM. `requestAnimationFrame` loop. No canvas rendering for the grid — DOM elements only.
CSS transitions handle animation (snap vs. release curves). JS drives state, CSS drives motion.

## State

Single `STATE` object. No globals outside it. `Float32Array` for brightness, `Uint8Array` for binary checked state.

## No Build System

No npm, no bundler, no TypeScript, no framework. CDN imports only.
If this changes, update this file before writing any code.
