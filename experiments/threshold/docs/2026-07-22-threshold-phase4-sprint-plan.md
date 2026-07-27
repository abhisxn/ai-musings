# Threshold Phase 4 Sprint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship all six Phase 4 tracks from `docs/superpowers/specs/2026-07-22-threshold-phase4-sprint-design.md` — Leva live-sync (A), post-fx performance trim (B), Session Arc legibility (C), audio mix/reactivity (D), render-mode differentiation (E), onboarding emoji polish (F) — as six worktree-parallel diffs that merge cleanly in one sequence.

**Architecture:** Each track is a self-contained diff against `main` at the same starting commit. Five of six tracks (A, B, D, E, F) touch disjoint files/line-ranges and can be reviewed/merged in any order relative to each other. Track C and Track A both touch `ThresholdView.tsx`'s `Visuals > render` Leva block — C only renames the `mood` control's `label`, A converts the whole block to function-schema form — so **C must merge before A**, and A's worktree must rebase onto main immediately after C lands, before A's code review.

**Tech Stack:** No new dependencies. Same stack as Phase 3 (`leva@^0.10.1`, `tone@^15.1.22`, `@react-three/postprocessing@^3.0.4`, `vitest@^4.1.10`). Confirmed via `node_modules/leva/dist/declarations/src/useControls.d.ts`: `useControls` only returns a `set`/`get` tuple when its schema argument is passed as a function (`SchemaOrFn = S | (() => S)`), which is why Track A must convert the `Visuals` block from object-form to function-form.

---

## File Structure

| File | Status | Track(s) |
|---|---|---|
| `experiments/threshold/src/theme.ts` | modify | C (add `PHASE_LABELS`) |
| `experiments/threshold/src/__tests__/theme.test.ts` | modify | C |
| `experiments/threshold/src/ThresholdView.tsx` | modify | C (label rename, depth-meter text), A (function-schema conversion, sync effect), B (DoF gating, Bloom cap) |
| `experiments/threshold/src/OnboardingOverlay.tsx` | modify | C (copy) |
| `experiments/threshold/src/levaSync.ts` | new | A (pure sync-payload builder) |
| `experiments/threshold/src/__tests__/levaSync.test.ts` | new | A |
| `experiments/threshold/src/audio.ts` | modify | D (dB curve, layer gains, pitch reactivity) |
| `experiments/threshold/src/__tests__/audio.test.ts` | new | D |
| `experiments/threshold/src/Scene.tsx` | modify | E (lines axis-swap, pixel/ascii split) |
| `experiments/threshold/src/onboardingSteps.ts` | modify | F (add `emoji` field) |
| `experiments/threshold/src/__tests__/onboarding.test.ts` | modify | F (extend swatch assertions) |

Sequencing rule (the one real conflict): **Track C merges before Track A.** Both touch `ThresholdView.tsx`'s `Visuals > render` folder (currently lines 317-328) — C's diff there is a one-word `label` addition to the `mood` control; A's diff there converts the entire block from object-schema to function-schema. Landing C first means A's rebase only has to re-apply a one-line label change, not the reverse. B, D, E, F are file/region-disjoint from C and A and from each other — no ordering constraint.

---

## Track C — Arc Legibility (merges first)

**Files:**
- Modify: `experiments/threshold/src/theme.ts`
- Test: `experiments/threshold/src/__tests__/theme.test.ts`
- Modify: `experiments/threshold/src/ThresholdView.tsx:317-328` (Leva label), `experiments/threshold/src/ThresholdView.tsx:542-558` (depth meter)
- Modify: `experiments/threshold/src/OnboardingOverlay.tsx:173-183` (step 0 copy)

### Task C1: Add `PHASE_LABELS` export

- [ ] **Step 1: Write the failing test**

Add to `experiments/threshold/src/__tests__/theme.test.ts` (append to the existing file):

```typescript
import { PHASE_LABELS } from '../theme'

describe('PHASE_LABELS', () => {
  it('maps every Phase to an uppercase display label', () => {
    expect(PHASE_LABELS.calm).toBe('CALM')
    expect(PHASE_LABELS.active).toBe('BUILDING')
    expect(PHASE_LABELS.climax).toBe('CLIMAX')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd experiments/threshold && npx vitest run src/__tests__/theme.test.ts`
Expected: FAIL with `PHASE_LABELS is not exported` or similar.

- [ ] **Step 3: Add the export**

In `experiments/threshold/src/theme.ts`, next to the existing `PHASE_COLORS` export, add:

```typescript
export const PHASE_LABELS: Record<Phase, string> = {
  calm: 'CALM',
  active: 'BUILDING',
  climax: 'CLIMAX',
}
```

(`Phase` is already imported/defined in this file per the existing `PHASE_COLORS` declaration — reuse the same type, do not redeclare it.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd experiments/threshold && npx vitest run src/__tests__/theme.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add experiments/threshold/src/theme.ts experiments/threshold/src/__tests__/theme.test.ts
git commit -m "feat(threshold): add PHASE_LABELS for Session Arc display text"
```

### Task C2: Show the Arc phase name on the depth meter

**Files:**
- Modify: `experiments/threshold/src/ThresholdView.tsx:542-558`

- [ ] **Step 1: Import `PHASE_LABELS`**

In `ThresholdView.tsx`'s existing import line for `theme.ts` (`import { getTheme, PHASE_COLORS } from './theme'`), change to:

```typescript
import { getTheme, PHASE_COLORS, PHASE_LABELS } from './theme'
```

- [ ] **Step 2: Add the label under the depth-meter bar**

Replace the current depth-meter block (`ThresholdView.tsx:542-558`):

```jsx
<div className="flex flex-col items-center gap-1">
  <div className="w-[3px] h-20 bg-[#1a1a1a] rounded-full relative">
    <div 
      className={`absolute bottom-0 w-full rounded-full transition-all duration-500 ${styles.neonGlow}`}
      style={{
        height: `${sessionEnergy}%`,
        background: PHASE_COLORS[currentPhase],
        color: PHASE_COLORS[currentPhase],
        opacity: moodEnabled ? 1 : 0.15,
      }}
    />
  </div>
</div>
```

with:

```jsx
<div className="flex flex-col items-center gap-1">
  <div className="w-[3px] h-20 bg-[#1a1a1a] rounded-full relative">
    <div 
      className={`absolute bottom-0 w-full rounded-full transition-all duration-500 ${styles.neonGlow}`}
      style={{
        height: `${sessionEnergy}%`,
        background: PHASE_COLORS[currentPhase],
        color: PHASE_COLORS[currentPhase],
        opacity: moodEnabled ? 1 : 0.15,
      }}
    />
  </div>
  <span
    className="text-[8px] tracking-[0.2em] font-bold"
    style={{ color: PHASE_COLORS[currentPhase], opacity: moodEnabled ? 0.85 : 0.15 }}
  >
    {moodEnabled ? PHASE_LABELS[currentPhase] : 'ARC OFF'}
  </span>
</div>
```

- [ ] **Step 3: Manual verification**

Run: `cd experiments/threshold && npm run dev` (or the repo's `run` skill), open Threshold, toggle Session Arc on via `0`, move around to trigger calm→active→climax, confirm the label text updates and reads "ARC OFF" when disabled.

- [ ] **Step 4: Commit**

```bash
git add experiments/threshold/src/ThresholdView.tsx
git commit -m "feat(threshold): show Session Arc phase name under depth meter"
```

### Task C3: Rename the Leva "mood" control to disambiguate from Palette

**Files:**
- Modify: `experiments/threshold/src/ThresholdView.tsx:317-328`

- [ ] **Step 1: Add a `label` to the `mood` control**

Replace the current `Visuals` block (`ThresholdView.tsx:317-328`):

```typescript
useControls('Visuals', {
  params: folder({
    threshold: { value: threshold, min: 0, max: 1, step: 0.01, onChange: setThreshold },
    extrusion: { value: extrusion, min: 0, max: 20, step: 0.1, onChange: setExtrusion },
    dithering: { value: ditherIntensity, min: 0, max: 1, step: 0.01, onChange: setDitherIntensity },
  }),
  render: folder({
    mode: { value: renderMode, options: [...RENDER_MODES], onChange: setRenderMode },
    theme: { value: theme, options: [...THEMES_LIST], onChange: setTheme },
    mood: { value: moodEnabled, onChange: setMoodEnabled },
  })
})
```

with:

```typescript
useControls('Visuals', {
  params: folder({
    threshold: { value: threshold, min: 0, max: 1, step: 0.01, onChange: setThreshold },
    extrusion: { value: extrusion, min: 0, max: 20, step: 0.1, onChange: setExtrusion },
    dithering: { value: ditherIntensity, min: 0, max: 1, step: 0.01, onChange: setDitherIntensity },
  }),
  render: folder({
    mode: { value: renderMode, options: [...RENDER_MODES], onChange: setRenderMode },
    theme: { value: theme, options: [...THEMES_LIST], onChange: setTheme },
    mood: { value: moodEnabled, label: 'session arc', onChange: setMoodEnabled },
  })
})
```

- [ ] **Step 2: Manual verification**

Open the Leva panel, confirm the `Visuals > render` folder now shows "session arc" instead of "mood" for the boolean toggle.

- [ ] **Step 3: Commit**

```bash
git add experiments/threshold/src/ThresholdView.tsx
git commit -m "fix(threshold): relabel Leva mood toggle as session arc to match GLOSSARY"
```

### Task C4: Update onboarding step 0 to name both systems

**Files:**
- Modify: `experiments/threshold/src/OnboardingOverlay.tsx:173-183`

- [ ] **Step 1: Extend the intro copy**

Replace (`OnboardingOverlay.tsx:173-183`):

```jsx
if (step === 0) {
  return (
    <div className="text-center flex flex-col gap-4">
      <h2 className={`${styles.hudHeading} text-xl tracking-[0.35em] font-bold`}>THRESHOLD</h2>
      <p className={`${styles.hudBody} leading-relaxed tracking-[0.15em] opacity-80`}>
        A VOLUMETRIC TERMINAL INSTRUMENT. YOUR WEBCAM TURNS MOTION INTO A LIVING
        AUDIOVISUAL FIELD — DEPTH, HUE AND THE CAMERA ITSELF RESPOND TO WHERE
        YOUR HAND MOVES.
      </p>
    </div>
  )
}
```

with:

```jsx
if (step === 0) {
  return (
    <div className="text-center flex flex-col gap-4">
      <h2 className={`${styles.hudHeading} text-xl tracking-[0.35em] font-bold`}>THRESHOLD</h2>
      <p className={`${styles.hudBody} leading-relaxed tracking-[0.15em] opacity-80`}>
        A VOLUMETRIC TERMINAL INSTRUMENT. YOUR WEBCAM TURNS MOTION INTO A LIVING
        AUDIOVISUAL FIELD — DEPTH, HUE AND THE CAMERA ITSELF RESPOND TO WHERE
        YOUR HAND MOVES.
      </p>
      <p className={`${styles.hudBody} leading-relaxed tracking-[0.15em] opacity-60`}>
        TWO SYSTEMS LAYER ON TOP: A PALETTE YOU CHOOSE (LUMINOUS / DEEP / PULSE),
        AND A SESSION ARC THAT BUILDS AUTOMATICALLY THE MORE YOU MOVE.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

Trigger onboarding (clear `threshold_onboarding_done` in localStorage or use the "?" replay icon), confirm step 0 shows both lines.

- [ ] **Step 3: Commit**

```bash
git add experiments/threshold/src/OnboardingOverlay.tsx
git commit -m "docs(threshold): explain Palette vs Session Arc split in onboarding step 0"
```

---

## Track A — Leva Live-Sync (merges after Track C, rebase required)

**Files:**
- New: `experiments/threshold/src/levaSync.ts`
- Test: `experiments/threshold/src/__tests__/levaSync.test.ts`
- Modify: `experiments/threshold/src/ThresholdView.tsx:317-328` (function-schema conversion + sync effect)

### Task A1: Pure sync-payload builder

- [ ] **Step 1: Write the failing test**

Create `experiments/threshold/src/__tests__/levaSync.test.ts`:

```typescript
/// <reference types="vitest/globals" />
import { buildLevaSyncPayload } from '../levaSync'

describe('buildLevaSyncPayload', () => {
  it('maps renderMode/theme/moodEnabled to dot-path Leva keys', () => {
    const payload = buildLevaSyncPayload('lines', 'acid', true)
    expect(payload).toEqual({
      'render.mode': 'lines',
      'render.theme': 'acid',
      'render.mood': true,
    })
  })

  it('reflects moodEnabled false', () => {
    const payload = buildLevaSyncPayload('radio', 'dark', false)
    expect(payload['render.mood']).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd experiments/threshold && npx vitest run src/__tests__/levaSync.test.ts`
Expected: FAIL — `Cannot find module '../levaSync'`.

- [ ] **Step 3: Write the implementation**

Create `experiments/threshold/src/levaSync.ts`:

```typescript
import type { RenderMode, Theme } from './store'

export function buildLevaSyncPayload(
  renderMode: RenderMode,
  theme: Theme,
  moodEnabled: boolean,
): Record<string, RenderMode | Theme | boolean> {
  return {
    'render.mode': renderMode,
    'render.theme': theme,
    'render.mood': moodEnabled,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd experiments/threshold && npx vitest run src/__tests__/levaSync.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add experiments/threshold/src/levaSync.ts experiments/threshold/src/__tests__/levaSync.test.ts
git commit -m "feat(threshold): add pure buildLevaSyncPayload for gesture→Leva sync"
```

### Task A2: Convert `Visuals` block to function-schema and wire the sync effect

**Files:**
- Modify: `experiments/threshold/src/ThresholdView.tsx:317-328`

- [ ] **Step 1: Import the new helper**

Add near the existing local imports in `ThresholdView.tsx`:

```typescript
import { buildLevaSyncPayload } from './levaSync'
```

- [ ] **Step 2: Convert to function-schema and capture `set`**

Replace the post-Track-C `Visuals` block:

```typescript
useControls('Visuals', {
  params: folder({
    threshold: { value: threshold, min: 0, max: 1, step: 0.01, onChange: setThreshold },
    extrusion: { value: extrusion, min: 0, max: 20, step: 0.1, onChange: setExtrusion },
    dithering: { value: ditherIntensity, min: 0, max: 1, step: 0.01, onChange: setDitherIntensity },
  }),
  render: folder({
    mode: { value: renderMode, options: [...RENDER_MODES], onChange: setRenderMode },
    theme: { value: theme, options: [...THEMES_LIST], onChange: setTheme },
    mood: { value: moodEnabled, label: 'session arc', onChange: setMoodEnabled },
  })
})
```

with:

```typescript
const [, setVisualsControls] = useControls('Visuals', () => ({
  params: folder({
    threshold: { value: threshold, min: 0, max: 1, step: 0.01, onChange: setThreshold },
    extrusion: { value: extrusion, min: 0, max: 20, step: 0.1, onChange: setExtrusion },
    dithering: { value: ditherIntensity, min: 0, max: 1, step: 0.01, onChange: setDitherIntensity },
  }),
  render: folder({
    mode: { value: renderMode, options: [...RENDER_MODES], onChange: setRenderMode },
    theme: { value: theme, options: [...THEMES_LIST], onChange: setTheme },
    mood: { value: moodEnabled, label: 'session arc', onChange: setMoodEnabled },
  })
}))

useEffect(() => {
  setVisualsControls(buildLevaSyncPayload(renderMode, theme, moodEnabled))
}, [renderMode, theme, moodEnabled, setVisualsControls])
```

`useEffect` is already imported in `ThresholdView.tsx` (used by the existing reticle/glitch effect at lines 196-227) — no new import needed for it.

- [ ] **Step 3: Manual verification**

Open the Leva panel. Trigger a FIST gesture (or press `1`-`7`) to change render mode via keyboard/gesture rather than the panel — confirm the Leva `render > mode` dropdown widget visibly updates to match. Repeat for OPEN_PALM/theme and PINCH/session-arc toggle. Confirm dragging the Leva controls directly still works (no infinite update loop — Leva's `set()` is a no-op when the value already matches).

- [ ] **Step 4: Commit**

```bash
git add experiments/threshold/src/ThresholdView.tsx
git commit -m "fix(threshold): sync Leva Visuals panel when gestures/keyboard change render state"
```

---

## Track B — Performance

**Files:**
- Modify: `experiments/threshold/src/ThresholdView.tsx` (post-fx JSX, ~588-614; `ppBloom` derivation, ~230-280)

### Task B1: Gate `DepthOfField` to volumetric view only

Depth-of-field blur is meaningless in `flat` view (all cells share the same Z), so it's a pure cost with no visible benefit there — confirmed by reading `Scene.tsx`'s flat-branch geometry, which never varies Z. Rendering it unconditionally wastes a full-screen post pass in the (default) flat view.

**Files:**
- Modify: `experiments/threshold/src/ThresholdView.tsx` (post-fx JSX, `<DepthOfField>` element)

- [ ] **Step 1: Wrap `DepthOfField` in a `viewMode` check**

Locate the post-fx JSX chain (`Bloom → HueSaturation → ChromaticAberration → DepthOfField → Glitch → Scanline → Noise → Vignette`). Change the `<DepthOfField ... />` element from an unconditional render to:

```jsx
{viewMode === 'volumetric' && (
  <DepthOfField focusDistance={0.02} focalLength={0.05} bokehScale={2.5} height={480} />
)}
```

(Use the exact prop values already present on the existing `<DepthOfField>` element in this file — do not change focus/bokeh tuning, only add the conditional wrapper.)

- [ ] **Step 2: Manual verification**

Switch to flat view (`Space`), confirm no depth-of-field blur artifact and check browser dev tools' performance/FPS panel shows a measurable frame-time improvement over volumetric view. Switch to volumetric, confirm DoF still renders as before.

- [ ] **Step 3: Commit**

```bash
git add experiments/threshold/src/ThresholdView.tsx
git commit -m "perf(threshold): skip DepthOfField pass in flat view where it has no visible effect"
```

### Task B2: Cap Bloom mip levels at climax

**Files:**
- Modify: `experiments/threshold/src/ThresholdView.tsx` (`ppBloom` derivation, ~230-280)

- [ ] **Step 1: Read the current `ppBloom` derivation**

Find the block deriving `ppBloom` from `currentPhase`/`quantizedEnergy` (lines ~230-280). It sets bloom intensity/levels higher as phase escalates toward `climax`.

- [ ] **Step 2: Cap the climax-phase mip levels value**

Wherever the climax branch sets a `levels` (or `mipmapBlur` level count) value for `<Bloom>`, reduce any value above 6 down to a max of 6. For example, if the current code has:

```typescript
levels: currentPhase === 'climax' ? 8 : currentPhase === 'active' ? 6 : 4,
```

change it to:

```typescript
levels: currentPhase === 'climax' ? 6 : currentPhase === 'active' ? 6 : 4,
```

(Match this edit to whatever the actual existing ternary/lookup shape is in this file — the goal is: climax's mip level count must not exceed 6.)

- [ ] **Step 3: Manual verification**

Move around vigorously to reach climax phase, confirm bloom still reads as intense/climactic but frame time doesn't spike as sharply as before (check dev tools performance panel before/after).

- [ ] **Step 4: Commit**

```bash
git add experiments/threshold/src/ThresholdView.tsx
git commit -m "perf(threshold): cap Bloom mip levels at climax phase to reduce GPU cost"
```

---

## Track D — Audio Mix + Reactivity

**Files:**
- Modify: `experiments/threshold/src/audio.ts`
- New test: `experiments/threshold/src/__tests__/audio.test.ts`

### Task D1: Replace the linear dB curve with a perceptual one

**Files:**
- Modify: `experiments/threshold/src/audio.ts:177`
- Test: `experiments/threshold/src/__tests__/audio.test.ts`

- [ ] **Step 1: Write the failing test**

Create `experiments/threshold/src/__tests__/audio.test.ts`:

```typescript
/// <reference types="vitest/globals" />
import { volumeToDb } from '../audio'

describe('volumeToDb', () => {
  it('maps 0 to -Infinity (silence)', () => {
    expect(volumeToDb(0)).toBe(-Infinity)
  })

  it('maps 100 to 0dB (unity gain)', () => {
    expect(volumeToDb(100)).toBeCloseTo(0, 5)
  })

  it('gives more headroom in the upper range than a linear curve would', () => {
    // Linear curve at volume=75 gives -15dB; the perceptual curve must be louder.
    const linear75 = (75 / 100) * 60 - 60
    expect(volumeToDb(75)).toBeGreaterThan(linear75)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd experiments/threshold && npx vitest run src/__tests__/audio.test.ts`
Expected: FAIL — `volumeToDb is not exported`.

- [ ] **Step 3: Extract and replace the inline calculation**

In `experiments/threshold/src/audio.ts`, replace line 177:

```typescript
const db = volume === 0 ? -Infinity : (volume / 100) * 60 - 60
```

with a call to a new exported function, defined near the top of the file below the existing `PHASE_VOLUMES` table:

```typescript
export function volumeToDb(volume: number): number {
  if (volume <= 0) return -Infinity
  return -60 + 60 * Math.pow(volume / 100, 0.5)
}
```

and at the original call site (line 177):

```typescript
const db = volumeToDb(volume)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd experiments/threshold && npx vitest run src/__tests__/audio.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add experiments/threshold/src/audio.ts experiments/threshold/src/__tests__/audio.test.ts
git commit -m "fix(threshold): replace linear volume→dB mapping with perceptual curve"
```

### Task D2: Raise sound-texture layer gains

The three texture-builder functions (`buildGlitchTexture`, `buildBloomTexture`, `buildBassTexture`, `audio.ts:53-142`) mix every layer 10-18dB below the main pad — combined with the old linear dB curve this made the texture layer nearly inaudible at the default volume (75). Task D1 fixes the master curve; this task fixes the per-layer mix so the texture itself is audible once the master curve is no longer crushing it.

**Files:**
- Modify: `experiments/threshold/src/audio.ts:53-142`

- [ ] **Step 1: Read the current gain values**

In each of `buildGlitchTexture`, `buildBloomTexture`, `buildBassTexture` (lines 53-142), find every `Tone.dbToGain(...)` call setting a layer's gain.

- [ ] **Step 2: Raise each by 6dB**

For every `Tone.dbToGain(-N)` call in these three functions, replace `-N` with `-(N - 6)`, floored at `0` (never raise a layer above unity gain). For example, a call currently reading:

```typescript
gain: Tone.dbToGain(-18)
```

becomes:

```typescript
gain: Tone.dbToGain(-12)
```

Apply this same `-6dB` shift to every `Tone.dbToGain` call found in `buildGlitchTexture`, `buildBloomTexture`, and `buildBassTexture` — do not touch any `Tone.dbToGain` calls outside these three functions (e.g. the main pad/rhythm mix defined elsewhere in the file stays as-is).

- [ ] **Step 3: Manual verification**

Enable audio, set volume to 75 (the default), cycle through `off → glitch → bloom → bass` sound textures via the Leva `Audio > soundscape` control, confirm each non-`off` texture is now clearly audible layered under the main pad (not just barely perceptible).

- [ ] **Step 4: Commit**

```bash
git add experiments/threshold/src/audio.ts
git commit -m "fix(threshold): raise sound-texture layer gains 6dB for audibility at default volume"
```

### Task D3: Add phase-driven pitch reactivity to texture voices

**Files:**
- Modify: `experiments/threshold/src/audio.ts` (near `triggerVoice`, lines 318-337)
- Test: `experiments/threshold/src/__tests__/audio.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `experiments/threshold/src/__tests__/audio.test.ts`:

```typescript
import { getTextureVoicePitchShift } from '../audio'

describe('getTextureVoicePitchShift', () => {
  it('is unshifted at calm', () => {
    expect(getTextureVoicePitchShift('calm')).toBe(0)
  })

  it('shifts up at active', () => {
    expect(getTextureVoicePitchShift('active')).toBe(5)
  })

  it('shifts up further at climax', () => {
    expect(getTextureVoicePitchShift('climax')).toBe(12)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd experiments/threshold && npx vitest run src/__tests__/audio.test.ts`
Expected: FAIL — `getTextureVoicePitchShift is not exported`.

- [ ] **Step 3: Implement the pure function and wire it into `triggerVoice`**

Add near `volumeToDb` in `audio.ts`:

```typescript
import type { Phase } from './types'

export function getTextureVoicePitchShift(phase: Phase): number {
  const shifts: Record<Phase, number> = { calm: 0, active: 5, climax: 12 }
  return shifts[phase]
}
```

(If `Phase` is already imported elsewhere in `audio.ts`, reuse that import instead of adding a duplicate.)

In `triggerVoice` (lines 318-337), find the line that triggers the note (e.g. `synth.triggerAttackRelease(note, duration, time)`) and apply the shift:

```typescript
const shiftedNote = Tone.Frequency(note).transpose(getTextureVoicePitchShift(currentPhase)).toNote()
synth.triggerAttackRelease(shiftedNote, duration, time)
```

`currentPhase` must be in scope at this call site — if `triggerVoice` doesn't already receive it as a parameter, add `currentPhase: Phase` to its parameter list and update its call site(s) to pass the current phase value through (the same `currentPhase` already read from the store elsewhere in this file's `build()` effect, lines 201-316).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd experiments/threshold && npx vitest run src/__tests__/audio.test.ts`
Expected: PASS

- [ ] **Step 5: Manual verification**

Enable audio with a texture selected, move to escalate through calm→active→climax, confirm the texture voice's pitch audibly rises with phase.

- [ ] **Step 6: Commit**

```bash
git add experiments/threshold/src/audio.ts experiments/threshold/src/__tests__/audio.test.ts
git commit -m "feat(threshold): pitch-shift sound-texture voices with Session Arc phase"
```

---

## Track E — Render Mode Differentiation

**Files:**
- Modify: `experiments/threshold/src/Scene.tsx:217-241` (flat/volumetric scale branches), `experiments/threshold/src/Scene.tsx:373-407` (geometry/material)

No unit-test surface exists for this track (per-cell `useFrame` scale logic, not extracted as pure functions, matching the existing codebase convention of not unit-testing `Scene.tsx`) — verification is manual/live only, per Phase 3's precedent for scene-visual tracks.

### Task E1: Swap `lines` mode to horizontal bars

**Files:**
- Modify: `experiments/threshold/src/Scene.tsx:217-241`

- [ ] **Step 1: Read the current scale branches**

Confirm the current flat-view `lines` branch (`Scene.tsx:222-223`):

```typescript
dummy.scale.set(spacing * 0.15, spacing * s * (0.5 + brightness), 1)
```

and volumetric-view `lines` branch (`Scene.tsx:236-237`):

```typescript
dummy.scale.set(spacing * 0.15, Math.max(0.05, brightness) * spacing * 4, spacing * 0.15)
```

Both elongate the Y axis (vertical bars) and keep X pinned to `spacing * 0.15`.

- [ ] **Step 2: Swap X and Y in both branches**

Replace the flat branch:

```typescript
dummy.scale.set(spacing * 0.15, spacing * s * (0.5 + brightness), 1)
```

with:

```typescript
dummy.scale.set(spacing * s * (0.5 + brightness), spacing * 0.15, 1)
```

Replace the volumetric branch:

```typescript
dummy.scale.set(spacing * 0.15, Math.max(0.05, brightness) * spacing * 4, spacing * 0.15)
```

with:

```typescript
dummy.scale.set(Math.max(0.05, brightness) * spacing * 4, spacing * 0.15, spacing * 0.15)
```

- [ ] **Step 3: Manual verification**

Switch render mode to `lines` (key `4`), confirm bars now run horizontally in both flat and volumetric view, brightness still visibly drives bar length.

- [ ] **Step 4: Commit**

```bash
git add experiments/threshold/src/Scene.tsx
git commit -m "feat(threshold): render lines mode as horizontal bars instead of vertical"
```

### Task E2: Split `pixel` from `ascii`'s shared scale branch

**Files:**
- Modify: `experiments/threshold/src/Scene.tsx:217-241`

- [ ] **Step 1: Read the current shared branch**

`Scene.tsx:218-219` (flat) and `232-233` (volumetric) currently handle `ascii` and `pixel` with one shared scale calculation (the exact shared conditional depends on the file's current branch structure — locate the condition combining `renderMode === 'ascii' || renderMode === 'pixel'` or equivalent grouped case).

- [ ] **Step 2: Give `pixel` its own inset scale**

Split the shared branch into two: keep `ascii`'s existing scale value untouched, and for `pixel` apply a 0.7× inset multiplier on top of whatever base scale `ascii` uses. Concretely, wherever the shared branch computes something like:

```typescript
dummy.scale.set(spacing * 0.9, spacing * 0.9, 1) // ascii + pixel shared, flat
```

change it to two branches:

```typescript
if (renderMode === 'ascii') {
  dummy.scale.set(spacing * 0.9, spacing * 0.9, 1)
} else if (renderMode === 'pixel') {
  dummy.scale.set(spacing * 0.9 * 0.7, spacing * 0.9 * 0.7, 1)
}
```

Apply the equivalent split (same 0.7× inset for `pixel`, `ascii` unchanged) to the volumetric-view branch at `232-233`.

- [ ] **Step 3: Manual verification**

Switch between `ascii` (key `5`) and `pixel` (key `6`) modes, confirm `pixel` cells now render visibly smaller/inset relative to `ascii`'s glyph-filling footprint, and `blocks` (key `3`) remains visually distinct from both (unaffected by this change).

- [ ] **Step 4: Commit**

```bash
git add experiments/threshold/src/Scene.tsx
git commit -m "feat(threshold): give pixel mode a distinct inset scale from ascii"
```

---

## Track F — Onboarding Polish

**Files:**
- Modify: `experiments/threshold/src/onboardingSteps.ts:38-42`
- Modify: `experiments/threshold/src/OnboardingOverlay.tsx:210-224` (step 2 swatch render)
- Test: `experiments/threshold/src/__tests__/onboarding.test.ts`

### Task F1: Add emoji to `GESTURE_SWATCHES`

- [ ] **Step 1: Write the failing test**

Append to `experiments/threshold/src/__tests__/onboarding.test.ts`:

```typescript
describe('gesture practice swatches emoji (Phase 4 Track F)', () => {
  it('gives every swatch a hand emoji matching its gesture', () => {
    const fist = GESTURE_SWATCHES.find((s) => s.key === 'fist')
    const palm = GESTURE_SWATCHES.find((s) => s.key === 'open_palm')
    const pinch = GESTURE_SWATCHES.find((s) => s.key === 'pinch')
    expect(fist?.emoji).toBe('✊')
    expect(palm?.emoji).toBe('🖐️')
    expect(pinch?.emoji).toBe('🤏')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd experiments/threshold && npx vitest run src/__tests__/onboarding.test.ts`
Expected: FAIL — `emoji` is `undefined`.

- [ ] **Step 3: Add the `emoji` field**

Replace `experiments/threshold/src/onboardingSteps.ts:38-42`:

```typescript
export const GESTURE_SWATCHES = [
  { key: 'fist', label: 'FIST', color: '#00ff41' },
  { key: 'open_palm', label: 'OPEN PALM', color: '#00ffff' },
  { key: 'pinch', label: 'PINCH', color: '#ff4400' },
] as const
```

with:

```typescript
export const GESTURE_SWATCHES = [
  { key: 'fist', label: 'FIST', color: '#00ff41', emoji: '✊' },
  { key: 'open_palm', label: 'OPEN PALM', color: '#00ffff', emoji: '🖐️' },
  { key: 'pinch', label: 'PINCH', color: '#ff4400', emoji: '🤏' },
] as const
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd experiments/threshold && npx vitest run src/__tests__/onboarding.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add experiments/threshold/src/onboardingSteps.ts experiments/threshold/src/__tests__/onboarding.test.ts
git commit -m "feat(threshold): add hand emoji to onboarding gesture-swatch data"
```

### Task F2: Render the emoji in the step-2 swatches

**Files:**
- Modify: `experiments/threshold/src/OnboardingOverlay.tsx:210-224`

- [ ] **Step 1: Add the emoji to the swatch markup**

Replace (`OnboardingOverlay.tsx:210-224`):

```jsx
<div className="flex justify-center gap-4">
  {GESTURE_SWATCHES.map((sw) => {
    const active = activeGesture === sw.key
    return (
      <div
        key={sw.key}
        className="hud-swatch w-20 h-28 flex flex-col items-center justify-center border-2 transition-all"
        data-active={active}
        style={{ ['--swatch' as string]: sw.color } as React.CSSProperties}
      >
        <span className="tracking-[0.2em] font-bold">{sw.label}</span>
      </div>
    )
  })}
</div>
```

with:

```jsx
<div className="flex justify-center gap-4">
  {GESTURE_SWATCHES.map((sw) => {
    const active = activeGesture === sw.key
    return (
      <div
        key={sw.key}
        className="hud-swatch w-20 h-28 flex flex-col items-center justify-center border-2 transition-all"
        data-active={active}
        style={{ ['--swatch' as string]: sw.color } as React.CSSProperties}
      >
        <span className="text-2xl">{sw.emoji}</span>
        <span className="tracking-[0.2em] font-bold">{sw.label}</span>
      </div>
    )
  })}
</div>
```

- [ ] **Step 2: Manual verification**

Trigger onboarding, advance to step 2 ("TRY THE GESTURES"), confirm each swatch shows its hand emoji above the label, matching the boot-screen mood-swatch pattern already established (`ThresholdView.tsx:390-417`).

- [ ] **Step 3: Commit**

```bash
git add experiments/threshold/src/OnboardingOverlay.tsx
git commit -m "feat(threshold): render hand emoji on onboarding gesture swatches"
```

---

## Testing Strategy

- **Track A**: `buildLevaSyncPayload` is a pure function, unit-tested directly. The `useEffect`/`useControls` wiring itself has no meaningful unit-test surface (Leva internals) — verified live per Task A2 Step 3.
- **Track B**: no unit-test surface (GPU/post-fx cost) — verified live via browser dev-tools frame timing, per each task's manual-verification step.
- **Track C**: `PHASE_LABELS` is unit-tested; the depth-meter/Leva-label/onboarding-copy changes are DOM/JSX-only — verified live.
- **Track D**: `volumeToDb` and `getTextureVoicePitchShift` are pure functions, unit-tested directly, following the same style as `useGestureControls.ts`'s `nextRenderMode`/`nextTheme`/`nextMoodEnabled`. The Tone.js gain/synth wiring itself has no meaningful unit-test surface — verified live.
- **Track E**: no unit-test surface (`Scene.tsx`'s per-frame scale logic is not extracted as pure functions, matching this file's existing convention of no unit tests) — verified live only.
- **Track F**: `GESTURE_SWATCHES`'s new `emoji` field is unit-tested directly, extending the existing `onboarding.test.ts` pattern.

## Verification (end to end, after all tracks merged)

- Leva panel: change render mode/theme/session-arc via gesture or keyboard, confirm the Leva `Visuals > render` widgets visibly update to match (Track A). Confirm dragging Leva controls directly still works with no jitter/loop.
- Leva panel: `Visuals > render > mood` control now reads "session arc" (Track C).
- Depth meter shows "CALM"/"BUILDING"/"CLIMAX"/"ARC OFF" text matching the current phase (Track C).
- Onboarding step 0 mentions both Palette and Session Arc; step 2 swatches show ✊/🖐️/🤏 (Tracks C, F).
- Flat view has no DepthOfField pass; volumetric view still shows it. Climax-phase bloom doesn't spike frame time as sharply as before (Track B).
- Default volume (75) makes all three sound textures (glitch/bloom/bass) clearly audible layered under the main pad; texture voice pitch audibly rises calm→active→climax (Track D).
- `lines` mode renders horizontal bars in both flat and volumetric view; `pixel` mode is visibly inset relative to `ascii` (Track E).
- `cd experiments/threshold && npx vitest run` passes (existing suite + new `levaSync.test.ts`, `audio.test.ts`, extended `theme.test.ts`/`onboarding.test.ts`).

### Critical files

- `experiments/threshold/src/ThresholdView.tsx` — Tracks A, B, C (see sequencing rule: C merges before A)
- `experiments/threshold/src/levaSync.ts` (new) — Track A
- `experiments/threshold/src/theme.ts` — Track C
- `experiments/threshold/src/OnboardingOverlay.tsx` — Tracks C, F
- `experiments/threshold/src/audio.ts` — Track D
- `experiments/threshold/src/Scene.tsx` — Track E
- `experiments/threshold/src/onboardingSteps.ts` — Track F
- `experiments/threshold/src/__tests__/` — new/extended tests for A, C, D, F
- `experiments/threshold/src/useGestureControls.ts` — reference only (naming/pattern precedent), not modified by this sprint

---

## Self-Review

**1. Spec coverage:** All 6 tracks from the design spec are covered — A (Task A1/A2), B (Task B1/B2), C (Tasks C1-C4), D (Tasks D1-D3), E (Tasks E1/E2), F (Tasks F1/F2). No spec section lacks a corresponding task.

**2. Placeholder scan:** No "TBD"/"TODO"/"add appropriate X" phrasing present. Every code step shows complete before/after code, not descriptions. Two tasks (B2, E1/E2) note that the exact existing conditional shape must be located and matched rather than assuming a single hardcoded line — this is a necessary hedge because the precise ternary/branch structure in `ThresholdView.tsx`'s `ppBloom` derivation and `Scene.tsx`'s scale branches wasn't quoted verbatim in this plan's grounding pass, not a placeholder for unwritten logic; the target behavior (cap at 6, split pixel from ascii) and one concrete example diff are always given.

**3. Type/naming consistency:** `buildLevaSyncPayload(renderMode, theme, moodEnabled)` (Task A1) is called with the same three arguments and same name in Task A2. `volumeToDb` and `getTextureVoicePitchShift` (Task D1/D3) match their test imports exactly. `PHASE_LABELS` (Task C1) is imported and consumed with the same name in Task C2. `GESTURE_SWATCHES[].emoji` (Task F1) is read with the same field name in Task F2. New pure functions (`buildLevaSyncPayload`, `volumeToDb`, `getTextureVoicePitchShift`) all follow the existing `nextRenderMode`/`nextTheme`/`nextMoodEnabled` naming convention from `useGestureControls.ts` — plain camelCase verbs, no abbreviation drift.

No gaps found requiring new tasks.

---

Plan complete and saved to `docs/superpowers/plans/2026-07-22-threshold-phase4-sprint-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
