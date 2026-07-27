# ADR 0012 — Render mode revival (literal-name overhaul)

## Status

Accepted (Phase 6 PR2 REV 2).

## Context

The 7 existing render modes (radio, dots, blocks, lines, ascii, pixel,
spectral) don't visually match their namesakes. User feedback:
- `radio` — not an actual radio button.
- `ascii` — not actual ASCII art.
- `pixel` — looks similar to dots.
- `lines` — looks like extruded dots; should be long horizontal OR
  vertical lines.
- `spectral` — needs complete change or removal.

The moodboard (`https://in.pinterest.com/abhisxn/spectral/`) provides
visual reference:
- Dithered classical busts (Bayer halftone over a photo).
- ASCII portrait of a woman's face in green numbers/characters.
- Half-circle pixel face (hard-edged squares).
- Halftone poster (oversized dot pattern).

## Decision

Revive each affected mode to look unmistakably like its namesake.
`RENDER_MODES` becomes:

```
radio   — literal radio button (outer ring + filled inner dot, dot
          scales 0..1 with cell brightness, reads as pressed/unpressed)
dots    — sphere field, with center-distance brightness falloff
blocks  — extruded cubes, 0.95 inter-cube gap so cells don't merge
hline   — long horizontal lines, one instance per row, full grid width
vline   — long vertical lines, one instance per column, full grid height
ascii   — 24-glyph atlas, per-cell quantize to glyph index, real ASCII
          art reading at any camera feed with figures
pixel   — hard Bayer-dithered bitmap squares, not soft alpha-blended
          dots (moodboard reference)
ribbon  — 3-band FFT, sin-wave displacement per cell (replaces spectral)
dither  — full Bayer-dithered halftone face via fragment shader
          (moodboard reference; reads as the dithered-bust pin)
```

Per-mode implementation notes:
- `radio`: 2 instanced meshes (`radioRingRef` torus + `radioDotRef`
  circle); ring scale fixed, dot scale proportional to brightness.
- `ascii`: 24-char atlas (`MWNBDHK0@$#8X%+=-:;,._'"`); per-cell
  `aGlyphIndex` quantizes to 24 buckets; shader uses `/ 24.0`
  instead of `/ 10.0`.
- `pixel`: `meshBasicMaterial` (no emissive desaturation) + new
  `generateBayerDitherAtlas(8, 8)` for hard-edged 8-level quantization.
- `hline`/`vline`: per-row / per-column mean-brightness accumulators
  in `useFrame`; one instance per row/col with full grid extent.
  `count = resolution`, not `resolution²`.
- `dither`: new `shaders.ts` with `bayerDitherVertexShader` +
  `bayerDitherFragmentShader`; fullscreen NDC plane (`planeGeometry[2,2]`);
  `frameTextureRef` from `useSampler` wraps the live webcam canvas.

## Consequences

- 9 modes total. Keyboard `1..9` cycles them.
- `lines` removed; `hline` + `vline` added (2 modes replace 1).
  Trade-off: more Leva dropdown entries, but each is more useful
  (one for horizontal rhythm, one for vertical).
- `spectral` removed; `ribbon` is the sole FFT-driven mode.
- `dither` is a new mode that consumes the `frameTextureRef`
  (exposed by `useSampler`); without that hook, the dither mode
  degrades to a black plane.
- Leva `Visuals → Render → Mode` dropdown grows from 7 to 9 options.
- `SessionHud.RENDER_MODE_DESC` grows from 7 to 9 entries (radio/ascii/
  pixel descriptions updated to match the literal-name aesthetic).

## Alternatives considered

- Reuse the existing `lines` mode and add an `orientation` sub-control.
  Rejected: conflates two distinct visual modes; users who want
  horizontal lines and vertical lines have different use cases.
- Skip `dither` mode and rely on the existing `pixel` mode being
  more dither-like. Rejected: `pixel` is per-cell (each cell is one
  dithered square), `dither` is fullscreen (the entire feed is one
  dithered image). Different visual identity.
