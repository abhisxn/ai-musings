# 0005 — ASCII per-instance glyph UV offset

**Status:** accepted
**Date:** 2026-07-26

## Decision

ASCII render mode gets a real per-instance character via a new `aGlyphIndex` `InstancedBufferAttribute` (one float per instance, set each frame from brightness) combined with a `material.onBeforeCompile` shader patch that offsets `vMapUv.x` by the glyph index before atlas sampling. The atlas canvas widens from 512px to 640px to fit all 10 glyphs at 64px each without clipping.

## Why

The prior ASCII implementation sampled the same atlas region across all instances (or an incorrectly-clipped one, given the 512px/640px canvas mismatch), so the mode never rendered distinct characters per cell — it looked like a stretched or repeated glyph rather than true ASCII art. Per-instance UV offsetting is the standard three.js technique for sprite-sheet-style variation across `InstancedMesh` instances without spawning one material per glyph.

## Consequences

Easier: ASCII mode now reads as actual ASCII art, directly addressing the "really bad, not truly ascii" complaint; the technique is reusable for any future per-instance texture-atlas variation (e.g. more glyphs, or reusing the pattern for other modes).

Harder: the shader patch depends on three.js's internal `vMapUv` varying name and the `#include <uv_vertex>` chunk boundary, which could change across major three.js versions and silently break the glyph offset on an upgrade — an integration test or visual regression check would catch this earlier than manual QA alone.
