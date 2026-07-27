# ADR 0010 — Ribbon render mode (spectral removal)

## Status

Accepted (Phase 6 PR2 REV 2).

## Context

Phase 5 made `spectral` an FFT-driven bar mode (one bar per column, height
per FFT bin). The user reports it "needs complete change or removal" —
the FFT-bars aesthetic doesn't read as distinct from other modes' data
pipelines and was described as visually redundant.

The FFT-driven approach is still valuable — it's the one mode that doesn't
just mirror pixel brightness — so a complete removal would lose a useful
aesthetic. The proposed replacement: rename to `ribbon`, shift the visual
identity from "FFT bar heights" to "audio-banded flowing horizontal
bands" (per-row sin-wave displacement, coarse 3-band FFT amplitude
driving wave magnitude).

## Decision

Remove `spectral` from `RENDER_MODES`. Add `ribbon` with the new
visual identity:
- Per-cell sin-wave displacement: `Math.sin(t*2 + x*0.3) * bandAmp * extrusion*0.5`
  on the Y position (cells undulate left-to-right).
- 3-band FFT bucketing (bass=0..7, mid=8..31, treble=32..63 of the
  64-bin FFT) — each row samples one band, the bucket index derived
  from `y/resolution` so the bottom row is bass, top row is treble.
- Same instanced-mesh + alphaMap pattern as other modes for visual
  consistency.

## Consequences

- `spectral` removed; `ribbon` added. `RENDER_MODES` grows from 8 to 9
  (spectral→ribbon+1 for new dither mode, see ADR-0012).
- 1 less mode in the keyboard `1..N` cycle; cycle now `1..9`.
- ADR-0010 supersedes the Phase 5 spec's "spectral = FFT-driven" decision.
- The mood color drives ribbon brightness (like other modes); the
  ribbon hue itself follows the mood (so DEEP→magenta ribbon, AZURE→blue
  ribbon, etc.).

## Alternatives considered

- Keep `spectral` as-is and add `ribbon` as a separate mode. Rejected:
  the user's complaint is that `spectral` is redundant; adding another
  FFT-driven mode without removing it doesn't address the feedback.
- Complete removal (no FFT-driven mode at all). Rejected: ribbon
  genuinely earns the audio-native slot — it's the only mode where the
  visual signal isn't just a recoloring of pixel brightness.
