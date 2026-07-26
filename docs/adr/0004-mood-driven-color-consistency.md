# 0004 — Mood-driven color consistency

**Status:** accepted
**Date:** 2026-07-26

## Decision

When `moodEnabled` is on, cell color in `Scene.tsx` is computed via a new `getMoodGradientColor(baseHue, brightness)` HSL function (fixed hue per mood, brightness drives lightness) instead of the theme-based `getGradientColor(theme, brightness)`. When `moodEnabled` is off, `getGradientColor` is used as before.

## Why

Mood mode previously drove music and the mood-cycle UI but left grid color following the unrelated Leva `theme` selector, so switching moods didn't visibly change the render — the user couldn't tell mood mode was doing anything to the visuals. A single-hue HSL ramp per mood gives each mood (5 total: LUMINOUS, DEEP, PULSE, SOLAR, AZURE) an immediately recognizable, distinct color identity tied to its `baseHue`.

## Consequences

Easier: mood mode now has a clear, testable visual signature; `getMoodGradientColor` is a pure function following the same signature/target-reuse pattern as `getGradientColor`, so it's drop-in and zero-allocation on the hot per-cell path.

Harder: two parallel color systems (theme-based, mood-based) now exist in `Scene.tsx`, gated on `moodEnabled` — future color-related changes must update both paths or explicitly decide one is out of scope.
