# ADR 0011 — Multi-color themes

## Status

Accepted (Phase 6 PR2 REV 2).

## Context

`THEMES` had 4 entries (`dark`, `light`, `acid`, `heatmap`), all single-
accent except `heatmap` (a 5-stop gradient). The user wants more themes
and especially multi-color ones — the moodboard pins (purple/cyan
glitch face, Pip-Boy green screen, sunset gradient, infrared
thermal) all feature 2-3 distinct color accents that read as a
"this scene has a palette" rather than "this scene has a tint."

The existing `ThemePalette` type has only `gradient: string[]` for
multi-color resolution, but no `blend` mode or named `accents` array.
`getGradientColor` always does a classic multi-stop lerp, which can't
express the "split at midpoint, then split again" or "parallel scanline"
patterns the new themes need.

## Decision

Extend `ThemePalette` with two new fields:

```ts
accents: string[]            // 1..3 named color accents
blend: 'split' | 'gradient' | 'parallel' | 'glitch'
```

`gradient` is preserved for back-compat. New themes populate both
`gradient` (for `getGradientColor`) and `accents` (for the new
`getAccentGradientColor`). The single-accent themes (`dark`/`light`/
`acid`) declare a 1-entry `accents` array, the multi-color themes
declare 2-3 entries.

Add 5 new themes:

| Key     | Accents                          | Blend     | Reference |
|---------|----------------------------------|-----------|-----------|
| `cyber` | `#00ffff` / `#ff00ff`            | `glitch`  | Purple/cyan glitch face (Valyphos) |
| `sunset`| `#ff4400` / `#ff00aa` / `#aa00ff`| `gradient`| Orange→pink→purple sunset |
| `ir`    | `#ff2200` / `#ffaa00` / `#ffffff`| `gradient`| Infrared thermal (red→amber→white) |
| `matrix`| `#00ff41` / `#00ff41` / `#003300`| `parallel`| Pip-Boy / Stranger Things phosphor (parallel scanline) |
| `noir`  | `#222222` / `#888888` / `#ffffff`| `gradient`| High-contrast black/white dither |

Add a new pure function `getAccentGradientColor(theme, brightness,
target)` that switches on the theme's `blend` mode:
- `gradient`: classic multi-stop lerp through `accents`.
- `split`: 0..0.5 lerps accent[0]→accent[1]; 0.5..1 lerps accent[1]→
  accent[2] (or stops at accent[1] for 2-accent themes).
- `parallel`: not yet wired in v1; falls back to gradient. The
  parallel-scanline effect is owned by the renderer for `matrix`.
- `glitch`: not yet wired in v1; falls back to gradient. Reserved for
  the cyber theme's per-frame stripe shift.

The existing `getGradientColor` is unchanged (still reads from the
legacy `gradient` field, used by the per-cell loop). `getAccentGradientColor`
is the entry point for new theme-aware code; renderer integration is
left for a follow-up sprint.

## Consequences

- 9 themes total. THEMES_LIST grows from 4 to 9.
- New `accents`/`blend` fields are optional for back-compat but always
  populated in v1.
- `getAccentGradientColor` is a pure function (no React/Three dep) and
  is testable in isolation.
- Tests assert: every theme has 1..5 accents; every theme declares a
  valid blend mode; multi-accent themes have >1 accent.

## Alternatives considered

- Just expand `gradient` to support more stops, no `accents` field.
  Rejected: doesn't capture the named-color semantics the user
  described, and `gradient` is positional (not semantic).
- Replace `getGradientColor` with `getAccentGradientColor` everywhere.
  Rejected: bigger blast radius; the per-cell render loop keeps using
  the cached `THEME_STOPS` from `gradient` for hot-path performance.
