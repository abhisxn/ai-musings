# Threshold — Glossary of Modes, Settings & Relationships

Reference doc for Threshold's terminology. Written for humans returning to this experiment after time away; kept in sync as the code changes.

## What Threshold is

A live webcam feed reinterpreted in real time as an ASCII/dither/pixel-art field, driven by hand gestures and, optionally, an evolving generative soundtrack tied to how much you move. Two independent systems layer on top of the base visual: a **Palette** (manual, aesthetic) and a **Session Arc** (automatic, motion-driven). They are easy to confuse because both eventually affect color — see [Palette vs. Arc](#palette-vs-arc-the-one-thing-worth-memorizing) below.

## Core render pipeline

| Term | What it is | Values |
|---|---|---|
| **Source Mode** | Where the per-cell brightness data comes from. | `pixel` (live webcam) / `demo` (synthetic pattern, no camera needed) |
| **View Mode** | How the cell grid is projected. | `flat` (2D plane) / `volumetric` (each cell extruded along Z by brightness) |
| **Render Mode** | The per-cell shape/glyph. | `radio`, `dots`, `blocks`, `ascii`, `pixel`, `ribbon`, `mesh`, `dither` (canonical order — `store.ts`) |
| **Resolution** | Grid density (cells per axis). | numeric slider |
| **Threshold** | Brightness cutoff below which a cell is treated as "off"/background. | 0–1, also driven live by `pinchDistance` |
| **Extrusion** | Z-depth multiplier in volumetric view. | numeric |
| **Dither Intensity** | Strength of the dither/halftone pattern applied to brightness before rendering. | 0–1 |
| **Inverse** | Flips bright/dark mapping. | boolean |
| **Show Grid** | Toggles a reference grid helper in the 3D scene. | boolean |

### Render Mode reference

| Mode | Shape | Notes |
|---|---|---|
| `radio` | ring + dot | literal UI radio button per cell |
| `dots` | sphere | geometry-based, visually distinct |
| `blocks` | filled square | extruded cube per cell |
| `ascii` | glyph atlas character | the one mode that does *not* use the shared gradient-color system |
| `pixel` | filled square | Bayer-dithered hard edges |
| `ribbon` | spectrum bar | FFT-mapped horizontal bands |
| `mesh` | wireframe plane | continuous surface displaced by per-cell brightness |
| `dither` | fullscreen halftone | fragment-shader Bayer dither |

All modes except `ascii` pull their per-cell color from the same shared gradient function (`getGradientColor`, `theme.ts:42`), keyed on the current **Theme** and that cell's brightness.

## Theme (color palette for the grid)

| Theme | Accent | Gradient |
|---|---|---|
| `dark` | green `#00ff41` | near-black → green |
| `light` | white `#f5f5f5` | near-black → white |
| `acid` | yellow-green `#ccff00` | dark olive → acid |
| `heatmap` | red `#ff003c` | blue → cyan → green → yellow → red (5-stop) |

Theme is independent of Palette/Arc below — it's purely the render grid's color scheme. Selected in the Visuals panel; the OPEN_PALM gesture toggles the Session Arc, not the theme.

## Palette vs. Arc — the one thing worth memorizing

Threshold has **two separate systems** that both end up changing color/sound, which is exactly why they're confusing together:

| | **Palette** (`currentMood`) | **Session Arc** (`currentPhase`) |
|---|---|---|
| Type | `'luminous' \| 'deep' \| 'pulse'` | `'calm' \| 'active' \| 'climax'` |
| Driven by | You — manual choice (OPEN_PALM gesture toggles arc on/off; the `m` key cycles the palette itself) | Automatic — your physical motion, moment to moment |
| What it picks | A whole musical/visual *identity*: scale, tempo range, synth waveform, rhythm pattern, texture type, base hue (`mood-config.ts`) | Where you currently sit *within* that identity: calm, building, or climax |
| Analogy | Choosing a song / instrument set | The song's dynamics — quiet verse vs. loud chorus — responding to how much you're moving |
| Changes with | Nothing automatic — stays fixed until you change it | Continuously, via the energy accumulator below |

Both feed the same downstream systems (scene color/material, audio), which is why moving your hand more can feel like it's "in the same mood but more intense" rather than "a different mood entirely" — that's the Arc operating inside a fixed Palette.

### Palette details (`currentMood`)

| Palette | Color | Scale | Tempo range | Texture character |
|---|---|---|---|---|
| **LUMINOUS** (default) | green `#00ff41` | C major pentatonic | 60–120 BPM | airy |
| **DEEP** | magenta `#ff00ff` | D♯ harmonic minor | 40–100 BPM | glitchy |
| **PULSE** | orange `#ff4400` | A blues | 80–140 BPM | rumbling |

### Session Arc details (`currentPhase`, driven by `sessionEnergy`)

An energy value (0–100) accumulates from how much motion is detected — wrist displacement frame-to-frame when hand-tracking is active, or raw video pixel-diff as a fallback when it isn't. It charges while you move (`CHARGE_RATE = 2`/sec) and drains while still (`DRAIN_RATE = 0.5`/sec), clamped to [0, 100].

| Phase | Energy band (rising) | Energy band (falling, hysteresis) | Color cue |
|---|---|---|---|
| `calm` | < 35 | drops back below 25 | green `#00ff41` |
| `active` | 35–70 | drops back below 65 (else stays active) | yellow `#ffff00` |
| `climax` | ≥ 70 | — | red `#ff4444` |

The gap between the rising and falling thresholds (e.g. enters `active` at 35 but must fall below 25 to return to `calm`) prevents the phase flickering back and forth when your energy hovers near a boundary. Within a phase, tempo interpolates between the Palette's `tempoRange` min (calm) and max (climax) — `getPhaseTempo()` in `mood-config.ts`.

The Arc only runs while **Session Arc enabled** (`moodEnabled`) is on — toggled by the OPEN_PALM gesture, the `a` key, or the Leva panel. When off (or before a camera/hand is available), energy resets to 0 and phase resets to `calm`.

*(Phase 4 adds a labeled on-screen indicator for this — today it only surfaces as a color swatch with no text label, which is the main source of "what does ARC even do" confusion.)*

## Audio

| Term | What it is |
|---|---|
| **Audio Enabled** | Master on/off for the Tone.js audio engine — requires a user gesture to satisfy the browser's autoplay policy. |
| **Audio Reactive** | Whether audio parameters respond to the visual/motion state at all, vs. playing a static loop. |
| **Volume** | 0–100 master fader → internally mapped to dB at the Tone.js destination. |
| **Sound Texture** | An additional, separate ambient layer laid on top of the Palette's pad/rhythm: `off`, `glitch`, `bloom`, or `bass`. Named after their sonic character, not tied to any visual "glitch"/"bloom" effect of the same name — the naming overlap with post-processing effect names is coincidental and a known point of confusion. |

Textures are quiet by design relative to the main pad (mixed several dB below it) — combined with the master volume's dB curve, this is why the default volume (75) can sound close to silent (Phase 4 Track D fix).

## Gestures (edge-triggered — fire once per gesture, not continuously while held)

| Gesture | Action | Cycles/toggles |
|---|---|---|
| FIST | toggle View Mode | `flat` ↔ `volumetric` |
| OPEN_PALM | toggle Session Arc | `moodEnabled` on/off |
| PINCH | live threshold control | `threshold` slider |
| THUMB_UP | next Render Mode | `RENDER_MODES` forward |
| THUMB_DOWN | previous Render Mode | `RENDER_MODES` backward |

FIST, OPEN_PALM, THUMB_UP, and THUMB_DOWN are edge-triggered one-shots (fire once per recognition). PINCH is continuous: when thumb↔index fingertip distance crosses the pinch threshold it is recognized, and while held the live `pinchDistance` signal drives the **Threshold** brightness-cutoff slider every frame — the edge itself is not a discrete app action.

Today, gesture-driven changes update the underlying app state correctly but don't visibly refresh the Leva debug panel's own control widgets (a known bug, fixed in Phase 4 Track A).

## Settings panel structure (Leva)

The debug/control panel is organized into folders: **Signal** (source/threshold/resolution), **Visuals** (render mode, theme, palette, view mode, extrusion, dither), **View** (grid, camera), **Audio** (enabled, reactive, volume, texture), **Gesture** (read-only monitor showing the last fired gesture).
