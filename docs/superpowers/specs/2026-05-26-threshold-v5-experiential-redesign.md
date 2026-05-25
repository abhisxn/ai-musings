# Threshold v5: Experiential Redesign

**Date:** 2026-05-26
**Status:** Design Spec
**Previous Specs:** `2026-05-14-threshold-10x-design.md`, `2026-05-22-threshold-v4-pipeline-complete.md`

## Problem Statement

v4 was technically ambitious but experientially flat. Users face:
- No gesture onboarding or discovery
- Broken AI source mode toggle
- Boring, static audio despite 3-layer architecture
- Scroll wheel hijacks threshold slider
- No dithering or textural visual quality
- Overpowering bloom that obscures geometry
- Binary mode switching (ON/OFF) with no buildup, decay, or drama

## Approach: Two Phases

**Phase 1:** Bug fixes and visual tuning (scroll bug, glow taming, dithering, source mode replacement)
**Phase 2:** Core experiential redesign (session arc, generative audio, gesture onboarding, mood system)

## Design Decisions

- **Experiential direction:** Hybrid — environment → instrument → narrative. A session evolves from ambient space to performance instrument with a dramatic arc.
- **Gesture discovery:** Progressive disclosure — first-load overlay tutorial → ambient edge panels → always-on mirror feedback
- **Audio direction:** Hybrid generative textures + melodic patterns. Generative atmosphere pad + Markov chain melody + clock-driven rhythm + sensory texture layer.
- **Visual aesthetic:** Organic bioluminescent + elegant minimal. Blue noise dithering, tamed bloom, whisper-thin line geometry, phase-driven color palette.
- **Experience arc:** Continuous (not discrete modes). Energy accumulator drives Calm → Active → Climax phases.
- **Mood selector:** Optional checkbox. When ON, replaces discrete modes with 3 moods (Luminous/Deep/Pulse) that drive the session arc. When OFF, classic v4 free play.
- **Dithering:** Slider (0–1) controlling blue noise intensity applied per-pixel in useFrame.
- **All 7 render modes and 4 themes retained.**

---

## Section 1: Experience Arc Architecture

### Session Phase State Machine

The session starts when the user opens Threshold. The `sessionEnergy` accumulator (float 0–100) drives three phases:

| Phase | Energy Range | Audio | Visual | Color Temp |
|-------|-------------|-------|--------|------------|
| Calm | 0–35 | Atmosphere layer only, 40 BPM, sparse | 30% grid active, extrusion 0–1.5, bloom 0.1 | Cool (6000K) — cyan, mint, deep blue |
| Active | 30–70 | Atmosphere + Melody + Texture, 80 BPM | 70% grid active, extrusion 1.5–6, bloom 0.5 | Neutral (4500K) — yellow-green, emerald, lavender |
| Climax | 65–100 | All 4 layers at full, 120 BPM | 100% grid active, extrusion 6–10, bloom 0.8 | Warm (3000K) — magenta, amber, orange-red |

### Energy Accumulation Model

- `motionMagnitude` (0–1): pixel brightness delta across all 3 zones, smoothed over 500ms
- `sessionEnergy` charges at `motionMagnitude × 2` per second, drains at 0.5/sec when still
- **Hysteresis:** 10% overlap bands prevent phase flipping. Calm→Active at 35, Active→Calm at 25. Active→Climax at 75, Climax→Active at 65.

### Mood Selector

Replaces mode buttons. Three moods, each setting initial musical DNA and color palette:

| Mood | Color | Scale | Tempo Range | Pad | Rhythm | Texture |
|------|-------|-------|-------------|-----|--------|---------|
| Luminous 🌿 | Cyan-green, cool | C major pentatonic | 60→120 BPM | AMSynth → Chorus → Reverb | 4/4, soft hats, rim shots | Airy noise, filtered sweeps |
| Deep 🔮 | Magenta-purple | D# harmonic minor | 40→100 BPM | FMSynth → Delay → Tremolo | 7/8, glitch fills, stutter | Noise → Bitcrush, ring mod |
| Pulse 🔥 | Orange-amber, warm | A blues scale | 80→140 BPM | MonoSynth → Distortion → Filter | 4/4, heavy kick, snare rolls | Sub-bass rumble, saturation |

### Session Timer + Depth Indicator

- Vertical depth meter bar (bottom-left) showing `sessionEnergy` (0–100%) with phase markers
- Elapsed time below the meter
- Users can see how deep they are and whether they're progressing or settling

### Mood Checkbox Behavior

- **UNCHECKED (Off):** Classic v4 behavior. Themes work as before. No session arc, no energy accumulator. Render modes, themes, threshold, extrusion all manual. Mode buttons removed.
- **CHECKED (On):** Session Arc activates. User picks a mood on init. Phase-driven colors override theme (theme influences base palette). Dithering still applies.
- **Mid-session toggle:** Toggling OFF resets to classic mode. Toggling ON restarts arc from Calm.

---

## Section 2: Audio Engine — Hybrid Generative + Melodic

### 4-Layer Architecture

Replace the 3 static per-mode builders with one generative engine:

| Layer | Description | Always On | Motion Modulation |
|-------|-------------|-----------|-------------------|
| **Atmosphere** | Generative textural pad. Granular/wavetable. Never repeats. Mood-driven timbre. | Yes, all phases | Filter cutoff (closed→open), volume, modulation depth |
| **Melody** | Markov chain sequencer over mood-specific scale. Pentatonic/blues/dorian. | Active+ phases | Note density (sparse→dense), octave range (2→4), velocity (ppp→fff) |
| **Rhythm** | Clock-driven percussion. Mood-determined pattern template. | Active+ phases | Swing (straight→swung), fill probability (0→50%), accent velocity |
| **Texture** | "Sensory dirt" — noise sweeps, glitch stutters, granular artifacts, sub rumble. | Active+ phases only | Presence, rate, grain size, chaos |

### Zone → Layer Emphasis

Left Zone → Texture emphasis. Center Zone → Melody emphasis. Right Zone → Rhythm emphasis. Video pixel brightness still maps to per-instance pitch/velocity for micro-level detail.

### Removed from v4 audio

- `soundType` selector (sine/chimes/bells/pulse)
- Static per-frame `triggerVoice`/`triggerClick` calls (replaced by clock-driven sequencer + generative voice)
- Per-mode builder functions (buildGlitchMode, etc.)

### Per-Phase Audio Parameters

| Phase | Atmosphere Vol | Melody Vol | Rhythm Vol | Texture Vol | Tempo |
|-------|----------------|------------|------------|-------------|-------|
| Calm | -6 dB | muted | muted | muted | 40–60 BPM |
| Active | -3 dB | -8 dB | -10 dB | -12 dB | 60–100 BPM |
| Climax | 0 dB | -4 dB | -6 dB | -8 dB | 100–140 BPM |

---

## Section 3: Visual Aesthetic — Bioluminescent Minimal

### Dithering

Blue noise 128×128 tileable texture loaded once. Applied in useFrame:

```
brightness > (threshold + noise[x % 128][y % 128] * ditherIntensity)
```

- **Dithering slider:** 0–1 in Visuals panel. 0 = clean threshold, 0.3 = default subtle organic scatter, 1.0 = heavy noise-driven pattern.
- **Pixel quantization** (optional toggle): reduce to 4 brightness levels per pixel for banded bioluminescent cell effect.

### Bloom (Tamed)

| Parameter | Calm | Active | Climax | v4 Default |
|-----------|------|--------|--------|------------|
| Intensity | 0.1 | 0.5 | 0.8 | 2.0 |
| Threshold | 0.5 | 0.4 | 0.3 | 0.2 |
| Levels | 6 | 6 | 6 | 8 |
| MipmapBlur | true | true | true | true |

### Geometry — Whisper-Thin (Default Grid Mode)

- Replace solid InstancedMesh boxes with vertical line segments per pixel (z=0 to z=extrusion) in the default grid render mode
- Instance scale reduced to 0.3–0.6 across all modes
- PointsMaterial with sizeAttenuation as fallback for performance  
- Each render mode keeps its own geometry type but uses reduced scale

### Color Palette

Phase-driven gradient: Cool bioluminescent (Calm) → Neutral pulsing (Active) → Warm intense (Climax). Mood shifts the base hue: Luminous stays blue-green, Deep shifts purple, Pulse shifts amber.

### Render Modes

All 7 retained: pixel, radio, blocks, dots, particles, ascii, spectral. Each mode adapted to the whisper-thin line geometry where applicable (e.g., blocks use scaled-down box geometry, dots/particles use PointsMaterial).

### Themes

All 4 retained: dark, light, acid, heatmap. When mood checkbox is OFF, themes work as v4. When mood is ON, theme influences the base palette but phase-driven colors dominate.

---

## Section 4: Gesture Interaction & Onboarding

### Phase 1: First-Load Overlay Tutorial

Shown once on first visit (localStorage flag). 9-second guided demo:
1. **Step 1 (3s):** Ghost silhouette pulses in center. 3 colored zones appear (left=magenta, center=cyan, right=orange). Text: "MOVE TO AWAKEN"
2. **Step 2 (3s):** Zone labels pulse sequentially: "MOVE HERE → TEXTURE" (left), "MOVE HERE → MELODY" (center), "MOVE HERE → RHYTHM" (right)
3. **Step 3 (3s):** "MOVE MORE → DEEPER EXPERIENCE" with depth meter animation. "STAND STILL → IT BREATHES" with settling animation
4. Dismissed by any movement or "GOT IT" button

### Phase 2: Ambient Edge Panels

Always-visible 4px-wide edge indicators:
- **Left edge:** Vertical strip of fine magenta particles shimmering with left-zone motion
- **Top edge:** Horizontal line rippling like water with center-zone activity (matches melodic density)
- **Bottom edge:** Bar pulsing with kick drum from rhythm layer

### Phase 3: Mirror Feedback

- **Webcam PIP:** 160×120 top-right corner showing raw feed with 3 zone overlay indicators
- **Gesture status text:** Bottom-left HUD showing detected zone activity (e.g., "LEFT ZONE 24%")

### Motion Detection

`useMotionZones` hook stays. Left zone motion adds 1.5× energy weight (texture emphasis). Center adds 1.0×. Right adds 1.5× (rhythm emphasis). Output becomes continuous modulation instead of binary mode trigger.

---

## Section 5: UI Controls Map

### Leva Panels

| Panel | Control | Status | Notes |
|-------|---------|--------|-------|
| Signal | Input | REPLACE | Camera / Video File / Demo |
| Signal | Grid Density | KEEP | 32–128 |
| Signal | Inverse | KEEP | Toggle |
| Visuals | Threshold | FIX SCROLL | Slider only, no wheel listener |
| Visuals | Extrusion | KEEP | 0.1–10 |
| Visuals | Dithering | NEW | Slider 0–1, default 0.3 |
| Visuals | Render Mode | KEEP | All 7 modes |
| Visuals | Theme | KEEP | All 4 themes |
| View | View Mode | KEEP | flat/volumetric |
| View | Grid | KEEP | Toggle |
| Audio | Enabled | KEEP | Toggle |
| Audio | Reactive | KEEP | Toggle |
| Audio | Volume | KEEP | -60–0 dB |
| — | Sound Type | REMOVE | Replaced by mood |
| — | Mode Buttons | REMOVE | Replaced by mood checkbox |

### New Elements (Outside Leva)

- **Mood selector checkbox:** Toggle in HUD. When ON, enables session arc.
- **Mood picker:** 3 buttons (Luminous/Deep/Pulse) on init screen + HUD button
- **Depth meter:** Vertical bar bottom-left with phase markers
- **Session timer:** Below depth meter
- **Webcam PIP:** Top-right corner
- **Gesture status text:** Bottom-left HUD
- **Keyboard shortcuts:** 1/2/3 = cycle render modes. 0/Space = view toggle. M = toggle mood.

### Removed

- Source mode (AI)
- Sound type selector (sine/chimes/bells/pulse)
- Mode buttons (GLITCH/BLOOM/BASS/IDLE)
- Themes remain but overridden by mood when mood is ON

---

## Implementation Order

### Phase 1: Fixes (Independent of Arc)

1. **Scroll bug:** Remove window wheel event listener. Threshold slider-only.
2. **Source mode replacement:** Drop AI source. Add Camera/Video File/Demo selector.
3. **Glow taming:** Reduce bloom defaults. Max intensity 0.8.
4. **Dithering:** Add blue noise texture, slider in store, modulate in useFrame.
5. **Render mode cleanup:** Keep 7 modes, adapt to line geometry where possible.

### Phase 2: Experiential Core

6. **Session arc state machine:** Add `sessionEnergy`, `currentPhase`, hysteresis to store.
7. **Depth meter + timer UI:** Vertical bar + elapsed time in HUD.
8. **Mood selector:** Checkbox toggle + mood picker UI + mood DNA config.
9. **Audio engine rewrite:** 4-layer generative engine. Atmosphere (granular), Melody (Markov), Rhythm (clock), Texture (artifacts). Per-mood DNA.
10. **Zone → layer emphasis:** Left=texture, Center=melody, Right=rhythm modulation.
11. **Gesture onboarding:** First-load overlay tutorial.
12. **Ambient edge panels:** Magenta particles, water ripple, pulse bar.
13. **Mirror feedback:** Webcam PIP + zone status text.
14. **Phase-driven colors:** Per-phase color palette overriding theme when mood is ON.
15. **Whisper-thin geometry:** Line segments for default grid, scale reduction across all 7 render modes.

---

## Open Questions

- Demo mode: what pattern? Sine wave + gradient, or a pre-recorded video loop?
- Video file input: drag-and-drop or file picker? Format support?
- Blue noise texture: precomputed PNG or runtime generation?
- Markov chain note selection: Tonality constraints to prevent bad notes?
- Granular synthesis in browser: Tone.js GrainPlayer or custom AudioWorklet?