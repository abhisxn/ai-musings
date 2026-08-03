# Architecture Decision Records — Threshold

All ADRs for the Threshold experiment, in chronological order. Each documents
a significant design choice made during development. Historical records — not
edited after acceptance, only superseded by new ADRs.

| #    | Title                                              | Date       | Phase   |
| ---- | -------------------------------------------------- | ---------- | ------- |
| 0004 | [Mood-driven color consistency](0004-mood-driven-color-consistency.md) | 2026-07-26 | Phase 5 |
| 0005 | [ASCII per-instance glyph UV offset](0005-ascii-per-instance-glyph-uv.md) | 2026-07-26 | Phase 5 |
| 0006 | [Spectral mode FFT redesign](0006-spectral-fft-redesign.md) | 2026-07-26 | Phase 5 |
| 0007 | [Texture/mood wiring via a single effective-texture value](0007-texture-mood-wiring.md) | 2026-07-26 | Phase 5 |
| 0008 | [Camera view enum + on/off + bleed-only opacity](0008-camera-mode-and-opacity.md) | 2026-07-26 | Phase 6 PR1 |
| 0009 | [Ambient + Pulse + Bloom2 + Glitch2 sound textures](0009-ambient-pulse-textures.md) | 2026-07-26 | Phase 6 PR3 |
| 0010 | [Ribbon render mode (spectral removal)](0010-ribbon-render-mode.md) | 2026-07-26 | Phase 6 PR2 |
| 0011 | [Multi-color themes](0011-multi-color-themes.md) | 2026-07-26 | Phase 6 PR2 |
| 0012 | [Render mode revival (literal-name overhaul)](0012-render-mode-revival.md) | 2026-07-26 | Phase 6 PR2 |
| 0013 | [GPU thermal guard layer](0013-thermal-guard.md) | 2026-08-03 | Phase 7 |
| 0014 | [Mesh render mode (continuous wireframe contour)](0014-mesh-render-mode.md) | 2026-08-03 | Proposed |

## Phase context

- **Phase 5** — render fixes, mood/texture unification, legibility HUD, camera background, intro redesign
- **Phase 6** — camera + defaults (PR1), render modes revival + multi-color themes (PR2), audio textures (PR3)
- **Phase 7** — GPU thermal safety layer, redundant rAF/mesh/shader removal, post-process + store throttle optimization
