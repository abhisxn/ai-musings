# Threshold Phase 5 Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Threshold's three weakest render modes, unify mood/color/texture wiring, add a depth-driven proximity warp, redesign the intro/HUD/camera-background UI, expand the mood cycle to 5 moods, and ship it all through ADRs, a worktree, tracked A/B/C/D subagent tasks, and a docs consolidation.

**Architecture:** Four parallel tracks in a single worktree branch (`threshold-phase5-sprint`). Track A touches the WebGL render engine (`Scene.tsx`, `theme.ts`, `vision/wrist-mapping.ts`). Track B touches the mood/sound data layer (`types.ts`, `mood-config.ts`, `audio.ts`, `store.ts`). Track C adds a new standalone `SessionHud.tsx` component + CSS, with no dependency on A or B. Track D (`ThresholdView.tsx`) is sequential — it wires up A, B, and C's outputs and must run after they're all merged. Each track is committed independently; Track D is the integration point.

**Tech Stack:** Next.js 15 (static export), React Three Fiber / three.js `^0.184.0`, Zustand store, Tone.js, Leva, Vitest, CSS Modules.

---

## File Structure

```
experiments/threshold/
  src/
    Scene.tsx                    # MODIFY — Track A (color, radio, ascii, spectral, depth warp)
    theme.ts                     # MODIFY — Track A1 (getMoodGradientColor)
    vision/
      wrist-mapping.ts           # MODIFY — Track A5 (depth-warp pure function)
      __tests__/wrist-mapping.test.ts  # MODIFY — Track A5 tests
    types.ts                     # MODIFY — Track B1 (Mood: 3→5)
    mood-config.ts                # MODIFY — Track B1/B2 (new moods, texture mapping)
    audio.ts                     # MODIFY — Track B2 (effective-texture wiring)
    store.ts                     # MODIFY — Track B3 (defaults)
    SessionHud.tsx                # CREATE — Track C (legibility HUD)
    threshold.module.css          # MODIFY — Track C (HUD styles)
    ThresholdView.tsx             # MODIFY — Track D (integration)
    __tests__/
      theme.test.ts               # MODIFY — Track A1 tests
      mood-config.test.ts         # CREATE — Track B1/B2 tests
      audio.test.ts               # MODIFY — Track B2 tests
docs/adr/
  0004-mood-driven-color-consistency.md   # CREATE
  0005-ascii-per-instance-glyph-uv.md     # CREATE
  0006-spectral-fft-redesign.md           # CREATE
  0007-texture-mood-wiring.md             # CREATE
experiments/threshold/docs/
  2026-07-22-threshold-phase3-sprint-design.md   # MOVE (git mv)
  2026-07-22-threshold-phase3-sprint-plan.md     # MOVE (git mv)
  2026-07-22-threshold-phase4-sprint-design.md   # MOVE (git mv)
  2026-07-26-threshold-phase5-sprint-design.md   # MOVE (git mv)
  2026-07-26-threshold-phase5-sprint-plan.md     # this file, already here
experiments/threshold/.context/
  LOG.md                         # MODIFY — new entry
```

---

## Task 0: Worktree Setup

**Files:** none (environment setup only)

- [ ] **Step 1: Create the worktree and branch**

```bash
git -C "/Users/abhishek/AI Musings" worktree add .worktrees/threshold-phase5-sprint -b threshold-phase5-sprint
```

- [ ] **Step 2: Install dependencies in the worktree**

```bash
cd "/Users/abhishek/AI Musings/.worktrees/threshold-phase5-sprint" && npm install
```

- [ ] **Step 3: Verify a clean baseline**

Run: `cd "/Users/abhishek/AI Musings/.worktrees/threshold-phase5-sprint" && npm test`
Expected: `137 passed` (or current passing count), 0 failures. If it fails, stop and report — do not proceed on a dirty baseline.

All subsequent tasks run inside `/Users/abhishek/AI Musings/.worktrees/threshold-phase5-sprint`. All file paths below are relative to that worktree root.

---

## Track A: Render Engine Fixes (Scene.tsx, theme.ts, wrist-mapping.ts)

### Task A1: Mood-driven color consistency

**Files:**
- Modify: `experiments/threshold/src/theme.ts`
- Modify: `experiments/threshold/src/Scene.tsx:33` (store destructuring), `Scene.tsx:253` (cellColor assignment)
- Test: `experiments/threshold/src/__tests__/theme.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `experiments/threshold/src/__tests__/theme.test.ts`:

```ts
import { getMoodGradientColor } from '../theme'

describe('getMoodGradientColor', () => {
  it('produces a darker color at brightness 0 than at brightness 1 for the same hue', () => {
    const dark = getMoodGradientColor(140, 0)
    const bright = getMoodGradientColor(140, 1)
    expect(bright.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(dark.getHSL({ h: 0, s: 0, l: 0 }).l)
  })

  it('uses the given hue for the HSL color', () => {
    const c = getMoodGradientColor(300, 0.5)
    const hsl = { h: 0, s: 0, l: 0 }
    c.getHSL(hsl)
    expect(hsl.h).toBeCloseTo(300 / 360, 3)
  })

  it('clamps brightness below 0 and above 1', () => {
    const low = getMoodGradientColor(50, -1)
    const zero = getMoodGradientColor(50, 0)
    const high = getMoodGradientColor(50, 2)
    const one = getMoodGradientColor(50, 1)
    expect(low.getHexString()).toBe(zero.getHexString())
    expect(high.getHexString()).toBe(one.getHexString())
  })

  it('reuses a target Color when provided', () => {
    const target = new (require('three').Color)()
    const result = getMoodGradientColor(140, 0.5, target)
    expect(result).toBe(target)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- theme.test.ts`
Expected: FAIL with "getMoodGradientColor is not a function" or import error.

- [ ] **Step 3: Add `getMoodGradientColor` to theme.ts**

Append to `experiments/threshold/src/theme.ts`:

```ts
// HSL-based color for mood mode: fixed hue per mood, brightness drives lightness.
// Mirrors getGradientColor's signature (reusable `target` for the hot per-cell path).
export function getMoodGradientColor(
  baseHue: number,
  brightness: number,
  target: THREE.Color = new THREE.Color(),
): THREE.Color {
  const b = Math.min(1, Math.max(0, brightness))
  return target.setHSL(baseHue / 360, 0.75, 0.08 + b * 0.42)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- theme.test.ts`
Expected: PASS, all `getMoodGradientColor` tests green.

- [ ] **Step 5: Wire it into Scene.tsx**

In `experiments/threshold/src/Scene.tsx`, the store destructuring at line 33 currently reads:

```ts
const { resolution, threshold, extrusion, viewMode, theme, inverse, audioReactive, audioEnabled, renderMode, showGrid, ditherIntensity, moodEnabled, currentPhase, handTracking, gestureTrackingStatus } = useStore()
```

Change it to add `currentMood`:

```ts
const { resolution, threshold, extrusion, viewMode, theme, inverse, audioReactive, audioEnabled, renderMode, showGrid, ditherIntensity, moodEnabled, currentMood, currentPhase, handTracking, gestureTrackingStatus } = useStore()
```

Add the import at the top of `Scene.tsx` (alongside the existing `theme.ts` import):

```ts
import { getGradientColor, getMoodGradientColor } from './theme'
import { MOOD_CONFIGS } from './mood-config'
```

- [ ] **Step 6: Swap in the mood color at the cellColor assignment**

Find line 253:

```ts
const cellColor = renderMode === 'ascii' ? null : getGradientColor(theme, brightness, cellColorScratch)
```

Replace with:

```ts
const cellColor = renderMode === 'ascii'
  ? null
  : moodEnabled
    ? getMoodGradientColor(MOOD_CONFIGS[currentMood].baseHue, brightness, cellColorScratch)
    : getGradientColor(theme, brightness, cellColorScratch)
```

- [ ] **Step 7: Run full test suite**

Run: `npm test`
Expected: all tests pass, no regressions.

- [ ] **Step 8: Commit**

```bash
git add experiments/threshold/src/theme.ts experiments/threshold/src/Scene.tsx experiments/threshold/src/__tests__/theme.test.ts
git commit -m "fix(threshold): drive cell color from mood hue when moodEnabled is on"
```

---

### Task A2: Radio mode — single-ring redesign

**Files:**
- Modify: `experiments/threshold/src/Scene.tsx`

- [ ] **Step 1: Remove `radioDotRef` from refs**

At lines 26-27, `Scene.tsx` currently declares:

```ts
const radioRingRef = useRef<THREE.InstancedMesh>(null)
const radioDotRef = useRef<THREE.InstancedMesh>(null)
```

Delete the `radioDotRef` line, leaving only `radioRingRef`.

- [ ] **Step 2: Remove `radioDotRef` from the `meshRefs` array**

At line 72, find the `meshRefs` array (which includes `radioRingRef` and `radioDotRef` among other mode refs). Remove `radioDotRef` from that array, keeping `radioRingRef`.

- [ ] **Step 3: Rewrite the radio useFrame block to draw one glow ring per cell**

At lines 265-283, `Scene.tsx` currently draws both an outer ring (`radioRingRef`) and an inner dot (`radioDotRef`) per cell. Replace the whole block with a single ring whose radius and opacity are brightness-driven:

```ts
if (renderMode === 'radio' && radioRingRef.current) {
  const glowRadius = spacing * (0.3 + brightness * 0.7)
  dummy.position.set(posX, posY, finalZ)
  dummy.scale.set(glowRadius, glowRadius, 1)
  dummy.rotation.set(0, 0, 0)
  dummy.updateMatrix()
  radioRingRef.current.setMatrixAt(i, dummy.matrix)
  if (cellColor) radioRingRef.current.setColorAt(i, cellColor)
}
```

(Keep this inside the existing per-cell loop, using the same `dummy`, `posX`, `posY`, `finalZ`, `spacing`, `brightness`, `cellColor`, and instance index `i` variables already in scope at that point in the loop — do not redeclare them.)

- [ ] **Step 4: Update the radio-ring `setColorAt`/`instanceMatrix.needsUpdate` flush**

Find wherever the existing code flushes `radioRingRef.current.instanceMatrix.needsUpdate = true` / `radioRingRef.current.instanceColor!.needsUpdate = true` (and the equivalent for `radioDotRef`) after the per-cell loop. Remove the `radioDotRef` flush lines, keep the `radioRingRef` ones.

- [ ] **Step 5: Remove the radio-dot JSX**

At lines 384-392, `Scene.tsx`'s JSX renders both a `radioRingRef` `<instancedMesh>` (a ring geometry) and a `radioDotRef` `<instancedMesh>` (a small sphere/circle). Delete the `radioDotRef` `<instancedMesh>` block entirely, keeping the `radioRingRef` one. Confirm the remaining `radioRingRef` mesh uses an additive-blending material (`blending={THREE.AdditiveBlending}` or equivalent) so brightness reads as glow — if the existing material lacks this, add it:

```tsx
<instancedMesh ref={radioRingRef} args={[undefined, undefined, resolution * resolution]}>
  <ringGeometry args={[0.6, 1, 24]} />
  <meshBasicMaterial transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} vertexColors />
</instancedMesh>
```

(Preserve whatever `ringGeometry` args and material props the original `radioRingRef` mesh already had — only remove the sibling `radioDotRef` mesh and add `blending`/`depthWrite` if not already present.)

- [ ] **Step 6: Manual visual check**

Run: `npm run dev` (from the worktree root)
Open `http://localhost:3002/experiments/threshold`, switch render mode to Radio via Leva. Expected: a single glowing ring per active cell, no separate inner dot, ring size/opacity tracks brightness.

Stop the dev server (Ctrl-C) before continuing.

- [ ] **Step 7: Run full test suite**

Run: `npm test`
Expected: all tests pass (this is a visual-only change, no new unit tests).

- [ ] **Step 8: Commit**

```bash
git add experiments/threshold/src/Scene.tsx
git commit -m "fix(threshold): radio mode draws one brightness-driven glow ring, remove inner dot"
```

---

### Task A3: ASCII mode — real per-instance glyphs

**Files:**
- Modify: `experiments/threshold/src/Scene.tsx`

- [ ] **Step 1: Widen the ASCII atlas canvas**

At lines 135-144, `Scene.tsx` currently builds the ascii atlas with:

```ts
canvas.width = 512
canvas.height = 64
```

10 glyphs (`'@%#*+=-:. '`) at 64px each need 640px, not 512px. Change to:

```ts
canvas.width = 640
canvas.height = 64
```

(Leave the glyph-drawing loop, font, and char string untouched — the loop already positions each glyph at `(i * 64) + 32`, which now fits all 10 glyphs inside the wider canvas.)

- [ ] **Step 2: Add a per-instance glyph-index attribute**

Near where other `InstancedBufferAttribute`s are set up for the ascii mesh (search for existing `InstancedBufferAttribute` usage in `Scene.tsx`, typically declared alongside the mesh ref via `useMemo` or inline in the JSX), add a new attribute sized to the instance count:

```ts
const aGlyphIndex = useMemo(
  () => new THREE.InstancedBufferAttribute(new Float32Array(resolution * resolution), 1),
  [resolution],
)
```

Place this `useMemo` near the top of the component, alongside other `resolution`-dependent memoized buffers.

- [ ] **Step 3: Set the glyph index per-instance in useFrame**

Inside the main per-cell loop in `useFrame` (the same loop that computes `brightness` for each cell), where the ascii-mode branch currently sets `dummy.position`/`dummy.scale` for the ascii instanced mesh, add:

```ts
if (renderMode === 'ascii') {
  const glyphIdx = Math.floor((1 - brightness) * 9)
  aGlyphIndex.array[i] = glyphIdx
}
```

(Atlas order is `'@%#*+=-:. '` — dense-to-sparse, so `brightness = 1` → index `0` → `'@'`, `brightness = 0` → index `9` → `' '`.)

After the loop (alongside the other `needsUpdate` flushes), add:

```ts
if (renderMode === 'ascii') {
  aGlyphIndex.needsUpdate = true
}
```

- [ ] **Step 4: Attach the attribute to the ascii mesh's geometry**

In the JSX, find the ascii `<instancedMesh>` block. Add an `<instancedBufferAttribute>` inside its `<planeGeometry>` (or equivalent) via the `attach` prop:

```tsx
<planeGeometry args={[...]}>
  <primitive object={aGlyphIndex} attach="attributes-aGlyphIndex" />
</planeGeometry>
```

(Use whatever geometry element the ascii mesh already uses — do not change its `args`, only add the `<primitive>` child that attaches `aGlyphIndex`.)

- [ ] **Step 5: Patch the material shader with `onBeforeCompile`**

Find the ascii mesh's material definition in the JSX (a `<meshStandardMaterial>` using the `asciiAtlas` texture as its `map`). Convert it to a `useMemo`'d material with an `onBeforeCompile` patch, since the shader injection needs a stable material instance:

```ts
const asciiMaterial = useMemo(() => {
  const mat = new THREE.MeshStandardMaterial({ map: asciiAtlas, transparent: true })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlyphIndex;')
      .replace(
        '#include <uv_vertex>',
        '#include <uv_vertex>\nvMapUv = vec2( ( vMapUv.x + aGlyphIndex ) / 10.0, vMapUv.y );',
      )
  }
  return mat
}, [asciiAtlas])
```

Replace the inline `<meshStandardMaterial map={asciiAtlas} .../>` JSX with `<primitive object={asciiMaterial} attach="material" />` on the ascii `<instancedMesh>`.

(`vMapUv` — not `vUv` — is the varying three.js 0.184 uses for `map` texture sampling; `#include <uv_vertex>` is the vertex-shader chunk where `vMapUv` is assigned from the geometry's base UV before this patch appends the glyph offset.)

- [ ] **Step 6: Manual visual check**

Run: `npm run dev`
Switch render mode to ASCII. Expected: each cell shows a distinct character from `'@%#*+=-:. '` based on its brightness (dense glyphs like `@` in bright areas, sparse/blank in dark areas) — not a single repeated or stretched glyph across all cells.

Stop the dev server before continuing.

- [ ] **Step 7: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add experiments/threshold/src/Scene.tsx
git commit -m "fix(threshold): ascii mode renders real per-instance glyphs via UV-offset shader patch"
```

---

### Task A4: Spectral mode — FFT-driven redesign

**Files:**
- Modify: `experiments/threshold/src/Scene.tsx`

- [ ] **Step 1: Replace the spectral block with FFT-bin-driven position/color**

At lines 286-299, `Scene.tsx` currently derives spectral mode's position/color from `cellColor` (brightness-based, via `getGradientColor`) plus a random shimmer — the same pixel-brightness data every other mode uses, making it feel redundant. Replace the block with FFT-bin-driven values so it's audio-native:

```ts
if (renderMode === 'spectral' && spectralRef.current && fftData) {
  const binIdx = Math.floor((x / resolution) * fftData.length)
  const binValue = fftData[binIdx] / 255
  const barHeight = binValue * extrusion * 4
  dummy.position.set(posX, posY, finalZ + barHeight / 2)
  dummy.scale.set(1, 1, Math.max(0.01, barHeight))
  dummy.rotation.set(0, 0, 0)
  dummy.updateMatrix()
  spectralRef.current.setMatrixAt(i, dummy.matrix)
  const spectralColor = moodEnabled
    ? getMoodGradientColor(MOOD_CONFIGS[currentMood].baseHue, binValue, cellColorScratch)
    : getGradientColor(theme, binValue, cellColorScratch)
  spectralRef.current.setColorAt(i, spectralColor)
}
```

(`x` and `resolution` are the existing loop variables already used elsewhere in `Scene.tsx`'s per-cell loop for column index and grid resolution. `spectralRef` is the existing ref for the spectral instanced mesh — reuse it, don't rename it. `fftData` must already be available in `Scene.tsx`'s scope — check the existing spectral block's imports/props for how FFT data currently reaches the component; if it's not yet threaded through, it is exposed by `useAudio()`'s `analyzerRef` — call `analyzerRef.current?.getValue()` once per frame near the top of `useFrame` and reuse the array for all spectral cells that frame, matching the pattern other audio-reactive code in `Scene.tsx` already uses for `audioReactive`-gated effects.)

- [ ] **Step 2: Flush the spectral instance buffers**

Confirm (or add, if missing) the post-loop flush for the spectral mesh, alongside the other modes' flushes:

```ts
if (renderMode === 'spectral' && spectralRef.current) {
  spectralRef.current.instanceMatrix.needsUpdate = true
  if (spectralRef.current.instanceColor) spectralRef.current.instanceColor.needsUpdate = true
}
```

- [ ] **Step 3: Manual visual check**

Run: `npm run dev`
Switch render mode to Spectral, enable audio (`audioEnabled`), play/speak into the mic. Expected: bar heights across the x-axis visibly track the live audio spectrum (bass on one side, treble on the other, per however `fftData` bins are ordered) rather than mirroring the webcam brightness pattern.

Stop the dev server before continuing.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all tests pass (visual/audio-reactive change, no new unit tests — FFT bin mapping is a one-line arithmetic expression not worth extracting/testing in isolation).

- [ ] **Step 5: Commit**

```bash
git add experiments/threshold/src/Scene.tsx
git commit -m "fix(threshold): spectral mode driven by live FFT bins instead of pixel brightness"
```

---

### Task A5: Depth-driven proximity grid warp

**Files:**
- Modify: `experiments/threshold/src/vision/wrist-mapping.ts`
- Modify: `experiments/threshold/src/Scene.tsx`
- Test: `experiments/threshold/src/vision/__tests__/wrist-mapping.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `experiments/threshold/src/vision/__tests__/wrist-mapping.test.ts`:

```ts
import { wristProximityWarp } from '../wrist-mapping'

describe('wristProximityWarp', () => {
  it('returns 0 when no hand is detected', () => {
    expect(wristProximityWarp(5, 5, null, false)).toBe(0)
  })

  it('returns 0 when the wrist is farther than the warp radius', () => {
    const wrist = { x: 0, y: 0, z: 0 }
    expect(wristProximityWarp(20, 20, wrist, true)).toBe(0)
  })

  it('returns maximum warp strength at zero distance', () => {
    const wrist = { x: 5, y: 5, z: 0 }
    expect(wristProximityWarp(5, 5, wrist, true)).toBeCloseTo(3, 5)
  })

  it('falls off linearly with distance within the warp radius', () => {
    const wrist = { x: 0, y: 0, z: 0 }
    const atRadius = wristProximityWarp(6, 0, wrist, true)
    const halfway = wristProximityWarp(3, 0, wrist, true)
    expect(atRadius).toBeCloseTo(0, 5)
    expect(halfway).toBeCloseTo(1.5, 5)
    expect(halfway).toBeGreaterThan(atRadius)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- wrist-mapping.test.ts`
Expected: FAIL with "wristProximityWarp is not a function" or import error.

- [ ] **Step 3: Implement `wristProximityWarp` in wrist-mapping.ts**

Append to `experiments/threshold/src/vision/wrist-mapping.ts`, following the file's existing pure-function pattern (no store/React dependency):

```ts
const WARP_RADIUS = 6
const WARP_STRENGTH = 3

// Grid cells near the tracked wrist push toward the viewer; falls off linearly
// to 0 at WARP_RADIUS so the effect stays local to the hand instead of
// warping the whole grid.
export function wristProximityWarp(
  cellX: number,
  cellY: number,
  wrist: WristPosition | null,
  detected: boolean,
): number {
  if (!detected || !wrist) return 0
  const dx = cellX - wrist.x
  const dy = cellY - wrist.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist >= WARP_RADIUS) return 0
  return (1 - dist / WARP_RADIUS) * WARP_STRENGTH
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- wrist-mapping.test.ts`
Expected: PASS, all `wristProximityWarp` tests green.

- [ ] **Step 5: Reorder posX/posY before zExtrusion in Scene.tsx and apply the warp**

In `Scene.tsx`'s `useFrame` loop, `posX`/`posY` are currently computed at lines 208-209, after `zExtrusion`/`finalZ`/`modeZ` are computed at lines 203-206. Reorder so `posX`/`posY` are computed first, then compute the warp, then fold it into `finalZ`:

```ts
const posX = (x - resolution / 2 + 0.5) * spacing
const posY = (y - resolution / 2 + 0.5) * spacing

const proximityWarp =
  gestureTrackingStatus === 'active' && handTracking.detected && handTracking.wrist
    ? wristProximityWarp(x, y, handTracking.wrist, handTracking.detected)
    : 0

const zExtrusion = /* existing zExtrusion expression, unchanged */
const modeZ = /* existing modeZ expression, unchanged */
const finalZ = zExtrusion + modeZ + proximityWarp
```

(Keep the existing `zExtrusion` and `modeZ` expressions exactly as they are today — only their position in the loop moves relative to `posX`/`posY`, and `finalZ`'s existing expression gains the `+ proximityWarp` term. `x` and `y` here are the existing loop-index variables for grid column/row already in scope.)

- [ ] **Step 6: Import `wristProximityWarp`**

Add to `Scene.tsx`'s imports:

```ts
import { wristProximityWarp } from './vision/wrist-mapping'
```

- [ ] **Step 7: Manual visual check**

Run: `npm run dev`
Enable gesture tracking, move your hand toward/away from the camera near the grid. Expected: grid cells near the tracked wrist position bulge toward the viewer, with the effect fading out over a local radius rather than affecting the whole grid.

Stop the dev server before continuing.

- [ ] **Step 8: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add experiments/threshold/src/vision/wrist-mapping.ts experiments/threshold/src/vision/__tests__/wrist-mapping.test.ts experiments/threshold/src/Scene.tsx
git commit -m "feat(threshold): add depth-driven grid warp around the tracked wrist"
```

---

### Track A merge to main

- [ ] **Step 1: Push and merge Track A**

```bash
cd "/Users/abhishek/AI Musings/.worktrees/threshold-phase5-sprint"
git -C "/Users/abhishek/AI Musings" fetch .worktrees/threshold-phase5-sprint threshold-phase5-sprint:threshold-phase5-sprint 2>/dev/null || true
```

(Track A's commits live on the shared `threshold-phase5-sprint` branch inside the worktree — no separate merge is needed until the full branch merges to `main` at the end of the sprint. This step is a no-op checkpoint; proceed to Track B.)

---

## Track B: Mood & Sound Data Layer (types.ts, mood-config.ts, audio.ts, store.ts)

### Task B1: Expand Mood type to 5 values

**Files:**
- Modify: `experiments/threshold/src/types.ts`
- Modify: `experiments/threshold/src/mood-config.ts`
- Modify: `experiments/threshold/src/ThresholdView.tsx:299`, `ThresholdView.tsx:400-425`
- Test: `experiments/threshold/src/__tests__/mood-config.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `experiments/threshold/src/__tests__/mood-config.test.ts`:

```ts
/// <reference types="vitest/globals" />
import { MOOD_CONFIGS, getPhaseTempo } from '../mood-config'
import { Mood } from '../types'

const ALL_MOODS: Mood[] = ['luminous', 'deep', 'pulse', 'solar', 'azure']

describe('MOOD_CONFIGS', () => {
  it('has exactly 5 moods', () => {
    expect(Object.keys(MOOD_CONFIGS).sort()).toEqual([...ALL_MOODS].sort())
  })

  it('gives every mood a complete config shape', () => {
    for (const mood of ALL_MOODS) {
      const cfg = MOOD_CONFIGS[mood]
      expect(typeof cfg.name).toBe('string')
      expect(typeof cfg.color).toBe('string')
      expect(typeof cfg.baseHue).toBe('number')
      expect(Array.isArray(cfg.scale)).toBe(true)
      expect(typeof cfg.scaleName).toBe('string')
      expect(cfg.tempoRange.length).toBe(2)
      expect(['amsynth', 'fmsynth', 'monosynth']).toContain(cfg.padWaveform)
      expect(typeof cfg.rhythmPattern).toBe('string')
      expect(['airy', 'glitch', 'rumble']).toContain(cfg.textureType)
    }
  })

  it('gives solar and azure distinct hues from the original 3 moods', () => {
    const hues = ALL_MOODS.map((m) => MOOD_CONFIGS[m].baseHue)
    expect(new Set(hues).size).toBe(5)
  })
})

describe('getPhaseTempo', () => {
  it('returns tempoRange bounds for calm and climax for every mood', () => {
    for (const mood of ALL_MOODS) {
      const [min, max] = MOOD_CONFIGS[mood].tempoRange
      expect(getPhaseTempo(mood, 'calm')).toBe(min)
      expect(getPhaseTempo(mood, 'climax')).toBe(max)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mood-config.test.ts`
Expected: FAIL — `MOOD_CONFIGS` only has 3 keys (`luminous`/`deep`/`pulse`), `solar`/`azure` missing.

- [ ] **Step 3: Expand the Mood type**

In `experiments/threshold/src/types.ts`, change:

```ts
export type Mood = 'luminous' | 'deep' | 'pulse'
```

to:

```ts
export type Mood = 'luminous' | 'deep' | 'pulse' | 'solar' | 'azure'
```

- [ ] **Step 4: Add the 2 new mood configs**

In `experiments/threshold/src/mood-config.ts`, add `solar` and `azure` entries to `MOOD_CONFIGS`:

```ts
export const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
  luminous: { name: 'LUMINOUS', color: '#00ff41', baseHue: 140, scale: ['C2','E2','G2','A2','C3','E3','G3','A3','C4'], scaleName: 'C major pentatonic', tempoRange: [60,120], padWaveform: 'amsynth', rhythmPattern: '4/4 soft', textureType: 'airy' },
  deep: { name: 'DEEP', color: '#ff00ff', baseHue: 300, scale: ['D#2','F#2','G#2','B2','C#3','D#3','F#3','G#3','B3'], scaleName: 'D# harmonic minor', tempoRange: [40,100], padWaveform: 'fmsynth', rhythmPattern: '7/8 glitch', textureType: 'glitch' },
  pulse: { name: 'PULSE', color: '#ff4400', baseHue: 20, scale: ['A2','C3','D3','Eb3','E3','G3','A3','C4','D4'], scaleName: 'A blues', tempoRange: [80,140], padWaveform: 'monosynth', rhythmPattern: '4/4 heavy', textureType: 'rumble' },
  solar: { name: 'SOLAR', color: '#ffcc00', baseHue: 50, scale: ['E2','F#2','G#2','A2','B2','C#3','D#3','E3','F#3'], scaleName: 'E major pentatonic', tempoRange: [70,130], padWaveform: 'amsynth', rhythmPattern: '4/4 bright', textureType: 'airy' },
  azure: { name: 'AZURE', color: '#00ccff', baseHue: 200, scale: ['F2','G2','A2','Bb2','C3','D3','F3','G3','A3'], scaleName: 'F major pentatonic', tempoRange: [50,110], padWaveform: 'fmsynth', rhythmPattern: '6/8 flow', textureType: 'rumble' },
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- mood-config.test.ts`
Expected: PASS.

- [ ] **Step 6: Update the keyboard-shortcut mood array in ThresholdView.tsx**

At line 299, `ThresholdView.tsx` currently has:

```ts
const moods: Mood[] = ['luminous', 'deep', 'pulse']
```

Change to:

```ts
const moods: Mood[] = ['luminous', 'deep', 'pulse', 'solar', 'azure']
```

- [ ] **Step 7: Update the intro-screen mood picker in ThresholdView.tsx**

At lines 400-425, `ThresholdView.tsx` maps over `(['luminous', 'deep', 'pulse'] as const)` and has a local `configs` object with `luminous`/`deep`/`pulse` entries (`{label, color, emoji}`). Change the array to:

```ts
(['luminous', 'deep', 'pulse', 'solar', 'azure'] as const)
```

And add `solar`/`azure` entries to the local `configs` object, matching the existing 3 entries' shape:

```ts
solar: { label: 'SOLAR', color: '#ffcc00', emoji: '☀️' },
azure: { label: 'AZURE', color: '#00ccff', emoji: '🌊' },
```

(Keep the existing `luminous`/`deep`/`pulse` entries in `configs` unchanged — only add the 2 new keys.)

- [ ] **Step 8: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add experiments/threshold/src/types.ts experiments/threshold/src/mood-config.ts experiments/threshold/src/ThresholdView.tsx experiments/threshold/src/__tests__/mood-config.test.ts
git commit -m "feat(threshold): expand mood cycle to 5 moods (add SOLAR, AZURE)"
```

---

### Task B2: Unify texture/mood wiring across the build effect and trigger functions

**Files:**
- Modify: `experiments/threshold/src/mood-config.ts`
- Modify: `experiments/threshold/src/audio.ts:58-62` (destructuring), `audio.ts:244-262` (build effect), `audio.ts:384-411` (triggerVoice/triggerClick)
- Test: `experiments/threshold/src/__tests__/mood-config.test.ts`, `experiments/threshold/src/__tests__/audio.test.ts`

`MoodConfig.textureType` (`'airy'|'glitch'|'rumble'`) and the store's `soundTexture` (`'off'|'glitch'|'bloom'|'bass'`) are different enums that have never been connected. Beyond the texture-build effect, `triggerVoice`/`triggerClick` also switch on the raw `soundTexture` value directly — both usage sites must read a single derived "effective texture" so mood mode and manual Leva texture selection never disagree.

- [ ] **Step 1: Write the failing test for the mapping function**

Append to `experiments/threshold/src/__tests__/mood-config.test.ts`:

```ts
import { moodTextureToSoundTexture } from '../mood-config'

describe('moodTextureToSoundTexture', () => {
  it('maps airy to bloom', () => {
    expect(moodTextureToSoundTexture('airy')).toBe('bloom')
  })
  it('maps glitch to glitch', () => {
    expect(moodTextureToSoundTexture('glitch')).toBe('glitch')
  })
  it('maps rumble to bass', () => {
    expect(moodTextureToSoundTexture('rumble')).toBe('bass')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mood-config.test.ts`
Expected: FAIL — `moodTextureToSoundTexture` is not exported.

- [ ] **Step 3: Implement `moodTextureToSoundTexture` in mood-config.ts**

Append to `experiments/threshold/src/mood-config.ts`:

```ts
export type SoundTexture = 'off' | 'glitch' | 'bloom' | 'bass'

const TEXTURE_MAP: Record<MoodConfig['textureType'], SoundTexture> = {
  airy: 'bloom',
  glitch: 'glitch',
  rumble: 'bass',
}

export function moodTextureToSoundTexture(textureType: MoodConfig['textureType']): SoundTexture {
  return TEXTURE_MAP[textureType]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- mood-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Write a failing test for effective-texture behavior in audio.ts**

Append to `experiments/threshold/src/__tests__/audio.test.ts`:

```ts
import { moodTextureToSoundTexture } from '../mood-config'

describe('effective texture resolution (mirrors useAudio internal logic)', () => {
  const resolveEffectiveTexture = (
    moodEnabled: boolean,
    moodTextureType: 'airy' | 'glitch' | 'rumble',
    soundTexture: 'off' | 'glitch' | 'bloom' | 'bass',
  ) => (moodEnabled ? moodTextureToSoundTexture(moodTextureType) : soundTexture)

  it('uses the raw soundTexture when moodEnabled is false', () => {
    expect(resolveEffectiveTexture(false, 'airy', 'bass')).toBe('bass')
  })

  it('uses the mood-derived texture when moodEnabled is true, ignoring the raw soundTexture', () => {
    expect(resolveEffectiveTexture(true, 'rumble', 'bloom')).toBe('bass')
  })
})
```

(This test documents the resolution rule that `useAudio()` must implement internally; `resolveEffectiveTexture` here is a local mirror for the test, since the real logic lives inline in the hook body, not as an exported function.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- audio.test.ts`
Expected: PASS immediately (this test only exercises the local mirror function, not `audio.ts` itself — it locks in the expected rule before Step 7 implements it for real).

- [ ] **Step 7: Add `effectiveTexture` to useAudio's hook body**

In `experiments/threshold/src/audio.ts`, the store destructuring at line 58 currently reads:

```ts
const { audioEnabled, volume, moodEnabled, currentMood, currentPhase } = useStore()
```

This already includes `moodEnabled` and `currentMood` — no change needed there. Just below the existing `soundTexture` selector (line 59) and the `MOOD_CONFIGS`/`moodTextureToSoundTexture` import, add a single derived value near the top of the hook body (before the texture-build `useEffect`):

```ts
import { MOOD_CONFIGS, moodTextureToSoundTexture } from './mood-config'

// ... inside useAudio(), after the existing selector destructuring:
const effectiveTexture = moodEnabled
  ? moodTextureToSoundTexture(MOOD_CONFIGS[currentMood].textureType)
  : soundTexture
```

- [ ] **Step 8: Replace `soundTexture` with `effectiveTexture` in the build effect**

At lines 244-262, `audio.ts`'s texture-build effect currently reads:

```ts
useEffect(() => {
  let cancelled = false
  disposeTexture()
  if (!audioEnabled || soundTexture === 'off' || !masterReady || !masterGainRef.current) return
  const setup = async () => {
    await ensureAudioContext()
    if (cancelled) return
    const master = masterGainRef.current!
    if (soundTexture === 'glitch') buildGlitchTexture(master)
    else if (soundTexture === 'bloom') buildBloomTexture(master)
    else if (soundTexture === 'bass') buildBassTexture(master)
    if (Tone.Transport.state !== 'started') Tone.Transport.start()
  }
  setup()
  return () => { cancelled = true; disposeTexture() }
}, [audioEnabled, soundTexture, masterReady])
```

Replace every `soundTexture` reference inside the effect body and its dependency array with `effectiveTexture`:

```ts
useEffect(() => {
  let cancelled = false
  disposeTexture()
  if (!audioEnabled || effectiveTexture === 'off' || !masterReady || !masterGainRef.current) return
  const setup = async () => {
    await ensureAudioContext()
    if (cancelled) return
    const master = masterGainRef.current!
    if (effectiveTexture === 'glitch') buildGlitchTexture(master)
    else if (effectiveTexture === 'bloom') buildBloomTexture(master)
    else if (effectiveTexture === 'bass') buildBassTexture(master)
    if (Tone.Transport.state !== 'started') Tone.Transport.start()
  }
  setup()
  return () => { cancelled = true; disposeTexture() }
}, [audioEnabled, effectiveTexture, masterReady])
```

- [ ] **Step 9: Replace `soundTexture` with `effectiveTexture` in triggerVoice and triggerClick**

At lines 384-411, `audio.ts`'s `triggerVoice` and `triggerClick` currently switch on the raw `soundTexture`:

```ts
if (soundTexture === 'glitch' && brightness > 0.7) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '32n')
else if (soundTexture === 'bloom' && brightness > 0.5) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '8n')
else if (soundTexture === 'bass' && brightness > 0.3) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '16n')
```

and

```ts
if (soundTexture === 'glitch' || soundTexture === 'bass') {
```

Replace all 4 `soundTexture` references (3 in `triggerVoice`, 1 in `triggerClick`) with `effectiveTexture`:

```ts
if (effectiveTexture === 'glitch' && brightness > 0.7) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '32n')
else if (effectiveTexture === 'bloom' && brightness > 0.5) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '8n')
else if (effectiveTexture === 'bass' && brightness > 0.3) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '16n')
```

and

```ts
if (effectiveTexture === 'glitch' || effectiveTexture === 'bass') {
```

(`effectiveTexture` is captured in the closure of both functions since they're defined inside the `useAudio()` hook body below where `effectiveTexture` is declared — no prop threading needed.)

- [ ] **Step 10: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 11: Manual check**

Run: `npm run dev`
Enable Mood mode, cycle through moods, and confirm (by ear, and by checking the Leva "texture" readout if visible) that the actually-playing texture always matches the current mood's `textureType` — not whatever the Leva texture dropdown was last manually set to.

Stop the dev server before continuing.

- [ ] **Step 12: Commit**

```bash
git add experiments/threshold/src/mood-config.ts experiments/threshold/src/audio.ts experiments/threshold/src/__tests__/mood-config.test.ts experiments/threshold/src/__tests__/audio.test.ts
git commit -m "fix(threshold): unify sound texture selection across build effect and trigger functions when mood mode is on"
```

---

### Task B3: Change store defaults

**Files:**
- Modify: `experiments/threshold/src/store.ts`

- [ ] **Step 1: Change `currentMood` default**

In `experiments/threshold/src/store.ts`, change:

```ts
currentMood: 'luminous' as Mood,
```

to:

```ts
currentMood: 'deep' as Mood,
```

- [ ] **Step 2: Change `soundTexture` default**

In the same file, change:

```ts
soundTexture: 'off' as 'off' | 'glitch' | 'bloom' | 'bass',
```

to:

```ts
soundTexture: 'bloom' as 'off' | 'glitch' | 'bloom' | 'bass',
```

(`audioReactive` already defaults to `true` — no change needed there.)

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all tests pass. If any test asserts the old defaults (`'luminous'`/`'off'`), update that assertion to match the new defaults — the new defaults are the intended behavior, not a regression.

- [ ] **Step 4: Commit**

```bash
git add experiments/threshold/src/store.ts
git commit -m "feat(threshold): default to DEEP mood with BLOOM texture enabled"
```

---

## Track C: Legibility HUD

### Task C1: SessionHud component and styles

**Files:**
- Create: `experiments/threshold/src/SessionHud.tsx`
- Modify: `experiments/threshold/src/threshold.module.css`

- [ ] **Step 1: Add HUD styles to threshold.module.css**

Append to `experiments/threshold/src/threshold.module.css`:

```css
.legibilityHud {
  position: absolute;
  top: 56px;
  left: 24px;
  z-index: 15;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  border: 1px solid var(--bracket-color, #00ff41);
  background: rgba(5, 5, 5, 0.55);
  pointer-events: none;
  max-width: 220px;
}

.legibilityRow {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.legibilityLabel {
  composes: hudCaption;
  color: var(--bracket-color, #00ff41);
  opacity: 0.9;
}

.legibilityDesc {
  composes: hudMicro;
  color: #f5f5f5;
  opacity: 0.55;
  letter-spacing: 0.08em;
  text-transform: none;
}
```

(Placed top-left, offset below the decorative `.bracketTL` corner mark so the two don't overlap; `pointer-events: none` keeps it from intercepting clicks on controls beneath it.)

- [ ] **Step 2: Create SessionHud.tsx**

Create `experiments/threshold/src/SessionHud.tsx`:

```tsx
import type { RenderMode, Theme } from './store'
import type { Mood } from './types'
import styles from './threshold.module.css'

const RENDER_MODE_DESC: Record<RenderMode, string> = {
  radio: 'Glow rings, brightness-driven radius',
  dots: 'Sphere field, position by brightness',
  blocks: 'Extruded cubes, height by brightness',
  lines: 'Horizontal scanlines',
  ascii: 'Live character glyphs, dense→sparse',
  pixel: 'Flat brightness grid',
  spectral: 'Live audio spectrum bars',
}

const THEME_DESC: Record<Theme, string> = {
  dark: 'Green phosphor on black',
  light: 'White on black',
  acid: 'Chartreuse high-contrast',
  heatmap: 'Blue→red thermal ramp',
}

const TEXTURE_DESC: Record<string, string> = {
  off: 'Silent',
  bloom: 'Bells and soft pads',
  glitch: 'Noise and digital fx',
  bass: 'Drone and low kick',
}

export interface SessionHudProps {
  renderMode: RenderMode
  theme: Theme
  moodEnabled: boolean
  currentMood: Mood
  soundTexture: string
}

export function SessionHud({ renderMode, theme, moodEnabled, currentMood, soundTexture }: SessionHudProps) {
  return (
    <div className={styles.legibilityHud}>
      <div className={styles.legibilityRow}>
        <span className={styles.legibilityLabel}>MODE // {renderMode.toUpperCase()}</span>
        <span className={styles.legibilityDesc}>{RENDER_MODE_DESC[renderMode]}</span>
      </div>
      <div className={styles.legibilityRow}>
        <span className={styles.legibilityLabel}>THEME // {theme.toUpperCase()}</span>
        <span className={styles.legibilityDesc}>{THEME_DESC[theme]}</span>
      </div>
      <div className={styles.legibilityRow}>
        <span className={styles.legibilityLabel}>ARC // {moodEnabled ? currentMood.toUpperCase() : 'OFF'}</span>
        <span className={styles.legibilityDesc}>
          {moodEnabled ? 'Mood-driven color + music cycle' : 'Manual theme + texture control'}
        </span>
      </div>
      <div className={styles.legibilityRow}>
        <span className={styles.legibilityLabel}>TEXTURE // {soundTexture.toUpperCase()}</span>
        <span className={styles.legibilityDesc}>{TEXTURE_DESC[soundTexture] ?? ''}</span>
      </div>
    </div>
  )
}
```

("ARC" is the existing in-app name for the mood-cycle system — the HUD's job is to make that name legible by pairing it with a plain-English description, directly answering the "I still don't understand the true value of ARC" complaint.)

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all tests pass (presentational component, no new unit tests — descriptions are static lookup tables, not logic worth testing in isolation).

- [ ] **Step 4: Commit**

```bash
git add experiments/threshold/src/SessionHud.tsx experiments/threshold/src/threshold.module.css
git commit -m "feat(threshold): add corner-anchored legibility HUD explaining mode/theme/ARC/texture"
```

---

## Track D: ThresholdView Integration (sequential, after A/B/C)

Track D depends on every prior track's output (`getMoodGradientColor`, the 5-mood cycle, `effectiveTexture` wiring, `SessionHud`), so it must start only after Tracks A, B, and C are committed.

### Task D1: Mount SessionHud

**Files:**
- Modify: `experiments/threshold/src/ThresholdView.tsx`

- [ ] **Step 1: Import SessionHud**

Add to `ThresholdView.tsx`'s imports:

```ts
import { SessionHud } from './SessionHud'
```

- [ ] **Step 2: Render it in the main return, alongside the existing bracket/HUD elements**

In the main render return (lines 453-636), find where the existing corner brackets (`.bracketTL` etc.) or status-bar HUD elements are rendered, and add `SessionHud` as a sibling, reading the needed state from the already-destructured store values (`renderMode, theme, moodEnabled, currentMood, soundTexture` — all already available in `ThresholdView`'s component scope per the confirmed destructuring):

```tsx
<SessionHud
  renderMode={renderMode}
  theme={theme}
  moodEnabled={moodEnabled}
  currentMood={currentMood}
  soundTexture={soundTexture}
/>
```

- [ ] **Step 3: Manual check**

Run: `npm run dev`
Expected: top-left HUD panel showing MODE/THEME/ARC/TEXTURE with one-line descriptions, updating live as Leva controls change.

Stop the dev server before continuing.

- [ ] **Step 4: Commit**

```bash
git add experiments/threshold/src/ThresholdView.tsx
git commit -m "feat(threshold): mount SessionHud in main view"
```

---

### Task D2: Camera full-bleed background with toggle

**Files:**
- Modify: `experiments/threshold/src/ThresholdView.tsx`

The `videoRef` webcam stream is currently attached to 3 separate `<video>` elements: the onboarding branch (line 446, `className="fixed opacity-0 pointer-events-none"`), the main branch's hidden gesture-capture element (line 462, same hidden classes), and the main branch's visible PIP (lines 513-526, small corner thumbnail behind UI). This task removes the small PIP and replaces it with a full-bleed background layer behind the 3D canvas, with a toggle to turn it on/off. The hidden onboarding (446) and gesture-capture (462) `<video>` elements are untouched — they're needed for MediaPipe hand tracking regardless of whether the background is visible.

- [ ] **Step 1: Add a `showCameraBackground` local state**

Near the top of the `ThresholdView` component (alongside other `useState` calls), add:

```ts
const [showCameraBackground, setShowCameraBackground] = useState(true)
```

- [ ] **Step 2: Replace the PIP block with a full-bleed background layer**

At lines 513-526, `ThresholdView.tsx` currently wraps the visible webcam video in a small top-right PIP div:

```tsx
<div className="absolute top-8 right-8 z-20 rounded overflow-hidden border border-white/10 opacity-30 hover:opacity-70 ...">
  <video ref={videoRef} ... style={{transform:'scaleX(-1)'}} className="w-32 h-24 object-cover" />
  {/* 3-zone overlay divs */}
</div>
```

Replace it with a full-bleed background layer, conditionally rendered, sitting behind the Canvas (lowest z-index in the stacking context) rather than in a corner:

```tsx
{showCameraBackground && (
  <div className="absolute inset-0 z-0 overflow-hidden">
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{ transform: 'scaleX(-1)' }}
      className="w-full h-full object-cover opacity-20"
    />
    <div className="absolute inset-0 bg-black/40" />
  </div>
)}
```

(Keep the same `videoRef` — do not create a second ref. `autoPlay muted playsInline` mirror the attributes the original PIP `<video>` element already had; carry over whichever of those three attributes the original element used verbatim. The `bg-black/40` overlay keeps the 3D grid readable against the live camera feed.)

Ensure the `<Canvas>` element and other foreground UI (Leva panel, HUD, status bar) have an explicit `z-10` or higher (via existing classes) so they render above this new `z-0` background layer — check the existing wrapping divs' z-index classes and bump any that currently rely on default stacking order (`z-index: auto`) to at least `z-10`.

- [ ] **Step 3: Add a toggle control**

Near the existing status-bar / onboarding-replay UI controls (search for where similar toggle buttons like the onboarding-replay button are rendered in the main return), add a toggle button:

```tsx
<button
  onClick={() => setShowCameraBackground((v) => !v)}
  className={`${styles.hudMicro} absolute top-8 right-8 z-20 px-2 py-1 border border-white/20 text-white/70 hover:text-white hover:border-white/50`}
>
  CAM // {showCameraBackground ? 'ON' : 'OFF'}
</button>
```

(Reuses the `.hudMicro` CSS Module class already imported as `styles` in this file, matching the existing HUD typography convention.)

- [ ] **Step 4: Manual check**

Run: `npm run dev`
Expected: webcam feed fills the background behind the 3D grid at low opacity, dimmed by an overlay; a top-right "CAM // ON/OFF" button toggles it; hand-gesture tracking still works with the background off (confirming the hidden gesture-capture `<video>` at line 462 is unaffected).

Stop the dev server before continuing.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add experiments/threshold/src/ThresholdView.tsx
git commit -m "feat(threshold): webcam feed as toggleable full-bleed background instead of small PIP"
```

---

### Task D3: Intro screen redesign

**Files:**
- Modify: `experiments/threshold/src/ThresholdView.tsx`

- [ ] **Step 1: Restyle the pre-initialized intro screen**

At lines 372-437, `ThresholdView.tsx`'s intro screen (rendered before `initialized` is true) currently reads as plain per the user's complaint ("I don't like the way it looks, very plain"). Wrap the existing content in the established CRT/bracket visual language already used elsewhere in the file: add the 4 corner `.bracket` divs (matching the pattern used in the main view — `.bracketTL`/`.bracketTR`/`.bracketBL`/`.bracketBR` with an inline `--bracket-color` style, as already done in the main return) around the intro screen's outer container, and apply `.hudHeading`/`.hudCaption` classes (already imported as `styles` in this file) to the title and instructional text elements instead of plain Tailwind text classes.

Locate the intro screen's outer wrapping `<div>` (the one gating on `!initialized`) and add the bracket siblings immediately inside it:

```tsx
<div className={styles.bracketTL} style={{ ['--bracket-color' as any]: '#00ff41' }} />
<div className={styles.bracketTR} style={{ ['--bracket-color' as any]: '#00ff41' }} />
<div className={styles.bracketBL} style={{ ['--bracket-color' as any]: '#00ff41' }} />
<div className={styles.bracketBR} style={{ ['--bracket-color' as any]: '#00ff41' }} />
```

(Match whatever exact `--bracket-color` inline-style pattern the main view's existing bracket usage already follows — reuse that pattern verbatim rather than introducing a new one.)

For the title text element, replace its existing plain text classes with:

```tsx
<h1 className={styles.hudDisplay}>THRESHOLD</h1>
```

For the mood-picker and start-button instructional copy, replace plain text classes with `styles.hudCaption`.

(Keep all existing intro-screen logic — the mood `.map()` from Task B1 Step 7, the start button's `onClick`, any existing conditional rendering — completely unchanged. This step only swaps CSS classes and adds the 4 decorative bracket divs; it does not restructure the JSX tree beyond that.)

- [ ] **Step 2: Manual check**

Run: `npm run dev`
Expected: intro screen now has bracket/reticle framing matching the main HUD's CRT aesthetic, title/labels use the monospace HUD type scale instead of plain sans-serif text.

Stop the dev server before continuing.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add experiments/threshold/src/ThresholdView.tsx
git commit -m "style(threshold): apply CRT/bracket visual language to the intro screen"
```

---

### Task D4: Leva restyle and gesture label clarity

**Files:**
- Modify: `experiments/threshold/src/ThresholdView.tsx`

- [ ] **Step 1: Clarify the Gesture folder's monitor label**

At lines 366-370, `ThresholdView.tsx`'s 'Gesture' Leva folder currently has a read-only `hand.last` monitor showing `` `${handTracking.gesture ?? 'idle'}  ·  ${gestureTrackingStatus}` ``. Per the complaint "gestures section - i dont understand", rename the monitor key and expand its output to plain language:

```ts
'hand tracking': monitor(() => {
  const gestureLabel = handTracking.gesture
    ? { fist: 'FIST — hold to pulse', open_palm: 'OPEN PALM — release', pinch: 'PINCH — zoom' }[handTracking.gesture]
    : 'no hand detected'
  const statusLabel = { idle: 'not started', loading: 'starting camera…', active: 'tracking', failed: 'camera unavailable' }[gestureTrackingStatus]
  return `${gestureLabel} (${statusLabel})`
}),
```

(Replace the existing `'hand.last': monitor(...)` key with this `'hand tracking'` key — same `monitor()` wrapper and folder placement, just a clearer key name and a full-sentence readout instead of the terse `gesture · status` format.)

- [ ] **Step 2: Add Leva theme customization for a more premium look**

`ThresholdView.tsx`'s Leva theme memo (lines 122-141) already exists — confirm it currently sets basic colors. Per the complaint "UI controls...has issues, dont look premium", extend the existing theme object (do not replace it — add to whatever keys are already present) with sharper corner radii and the app's accent color for consistency:

```ts
radii: { xs: '0px', sm: '0px', lg: '0px' },
fontSizes: { root: '11px' },
```

(Merge these into the existing theme memo's returned object alongside whatever `colors`/`space` keys are already there — do not remove existing keys.)

- [ ] **Step 3: Manual check**

Run: `npm run dev`
Expected: Gesture panel shows a full sentence describing hand state instead of a cryptic `fist · active`-style string; Leva panel has sharp corners and consistent small type matching the app's CRT aesthetic.

Stop the dev server before continuing.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add experiments/threshold/src/ThresholdView.tsx
git commit -m "style(threshold): clarify gesture monitor label, sharpen Leva panel styling"
```

---

## ADRs

### Task ADR-1: Mood-driven color consistency

**Files:**
- Create: `docs/adr/0004-mood-driven-color-consistency.md`

- [ ] **Step 1: Write the ADR**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0004-mood-driven-color-consistency.md
git commit -m "docs(adr): 0004 mood-driven color consistency"
```

---

### Task ADR-2: ASCII per-instance glyph UV offset

**Files:**
- Create: `docs/adr/0005-ascii-per-instance-glyph-uv.md`

- [ ] **Step 1: Write the ADR**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0005-ascii-per-instance-glyph-uv.md
git commit -m "docs(adr): 0005 ascii per-instance glyph UV offset"
```

---

### Task ADR-3: Spectral mode FFT redesign

**Files:**
- Create: `docs/adr/0006-spectral-fft-redesign.md`

- [ ] **Step 1: Write the ADR**

```markdown
# 0006 — Spectral mode FFT redesign

**Status:** accepted
**Date:** 2026-07-26

## Decision

Spectral render mode is redriven from live FFT bin data (`fftData[binIdx] / 255`, bin-indexed by x-column) for both bar height and color, replacing the prior pixel-brightness-driven position/color plus random shimmer.

## Why

Spectral mode's prior implementation used the exact same brightness input as every other render mode, just with an added random shimmer — it didn't represent audio in any way despite the name, making it feel redundant next to the other 6 modes ("I don't know what is it really doing, feels redundant"). Binning FFT data across the x-axis is the natural mapping for a "spectral" visualization and makes it the one mode that's genuinely audio-native rather than webcam-native.

## Consequences

Easier: spectral mode now has a distinct reason to exist among the 7 render modes — it's the audio-reactive one; the FFT-to-color path reuses the same `getMoodGradientColor`/`getGradientColor` branch as Task A1's color-consistency fix, so mood-mode color stays consistent even here.

Harder: spectral mode's visual output now depends on `audioEnabled`/microphone permission in a way other modes don't — if audio is off or unavailable, spectral mode has no meaningful signal to render (bars flatten to the FFT array's silence-floor values), which should be communicated to the user rather than left as an unexplained flat grid.
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0006-spectral-fft-redesign.md
git commit -m "docs(adr): 0006 spectral mode FFT redesign"
```

---

### Task ADR-4: Texture/mood wiring via a single effective-texture value

**Files:**
- Create: `docs/adr/0007-texture-mood-wiring.md`

- [ ] **Step 1: Write the ADR**

```markdown
# 0007 — Texture/mood wiring via a single effective-texture value

**Status:** accepted
**Date:** 2026-07-26

## Decision

`useAudio()` computes one `effectiveTexture` value per render (`moodEnabled ? moodTextureToSoundTexture(MOOD_CONFIGS[currentMood].textureType) : soundTexture`) and uses it consistently in the texture-build effect, `triggerVoice`, and `triggerClick` — replacing all direct reads of the raw `soundTexture` store value in those three sites.

## Why

`MoodConfig.textureType` (`'airy'|'glitch'|'rumble'`) and the store's `soundTexture` (`'off'|'glitch'|'bloom'|'bass'`) were two disconnected enums. A first-pass fix that wired the mapping only into the texture-build effect would have left `triggerVoice`/`triggerClick` still gating on the raw Leva `soundTexture` — meaning the audibly-built texture synth (bloom/glitch/bass) could mismatch the texture the trigger functions believed was active whenever `moodEnabled` was on and the Leva selector didn't happen to match the mood's implied texture. Computing `effectiveTexture` once and threading it through all three usage sites closes that gap at the source instead of patching each site's symptom separately.

## Consequences

Easier: mood mode and manual texture selection can never diverge — turning `moodEnabled` on always makes the currently-mood's texture the one actually heard, everywhere in the hook.

Harder: `soundTexture` (the raw Leva/store value) is no longer a reliable signal of "what texture is currently playing" from outside `useAudio()` — any future code that needs to know the *actual* playing texture (e.g. `SessionHud`) must either read `effectiveTexture` if it's exposed, or replicate the same `moodEnabled ? moodTextureToSoundTexture(...) : soundTexture` resolution rule.
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0007-texture-mood-wiring.md
git commit -m "docs(adr): 0007 texture/mood wiring via a single effective-texture value"
```

---

## Docs Consolidation

### Task DC1: Move scattered Threshold docs into experiments/threshold/docs/

**Files:**
- Move: `docs/superpowers/specs/2026-07-22-threshold-phase4-sprint-design.md`
- Move: `docs/superpowers/specs/2026-07-26-threshold-phase5-sprint-design.md`
- Move: `docs/plans/2026-07-22-threshold-phase3-sprint-design.md`
- Move: `docs/plans/2026-07-22-threshold-phase3-sprint-plan.md`

- [ ] **Step 1: git mv all 4 files**

```bash
git mv docs/superpowers/specs/2026-07-22-threshold-phase4-sprint-design.md experiments/threshold/docs/2026-07-22-threshold-phase4-sprint-design.md
git mv docs/superpowers/specs/2026-07-26-threshold-phase5-sprint-design.md experiments/threshold/docs/2026-07-26-threshold-phase5-sprint-design.md
git mv docs/plans/2026-07-22-threshold-phase3-sprint-design.md experiments/threshold/docs/2026-07-22-threshold-phase3-sprint-design.md
git mv docs/plans/2026-07-22-threshold-phase3-sprint-plan.md experiments/threshold/docs/2026-07-22-threshold-phase3-sprint-plan.md
```

Do NOT move `docs/plans/2026-07-22-visual-redesign-implementation-plan.md`, `docs/superpowers/specs/2026-07-22-per-experiment-isolation-design.md`, or `docs/superpowers/specs/2026-07-22-visual-redesign-design.md` — these are AI-Musings-wide, not Threshold-specific. Leave `experiments/threshold/GLOSSARY.md`, `README.md`, `VISUAL_STYLEGUIDE.md`, and `.context/` untouched — they already live in the right place.

- [ ] **Step 2: Verify the move**

Run: `git status`
Expected: 4 renames shown (old path → new path under `experiments/threshold/docs/`), no deletions without a corresponding addition.

- [ ] **Step 3: Commit**

```bash
git commit -m "docs(threshold): consolidate scattered planning docs into experiments/threshold/docs/"
```

---

### Task DC2: Update .context/LOG.md

**Files:**
- Modify: `experiments/threshold/.context/LOG.md`

- [ ] **Step 1: Add the Phase 5 entry**

Append a new line to `experiments/threshold/.context/LOG.md`, matching the file's existing dense single-line-per-phase convention:

```
[2026-07-26] [PHASE5] Done — fixed the 3 weak render modes (A): radio now draws one brightness-driven glow ring instead of ring+dot, ascii renders real per-instance glyphs via UV-offset shader patch, spectral is FFT-bin-driven instead of pixel-brightness; added mood-driven color consistency and a depth-driven proximity grid warp around the tracked wrist; expanded mood cycle to 5 (B): LUMINOUS/DEEP/PULSE/SOLAR/AZURE, unified sound-texture wiring across the build effect and trigger functions, defaulted to DEEP mood with BLOOM texture enabled; added a corner-anchored legibility HUD (C) explaining mode/theme/ARC/texture in plain language; redesigned the intro screen with CRT/bracket framing, replaced the webcam PIP with a toggleable full-bleed background layer, and clarified the Leva gesture-status label (D). 4 new ADRs (0004-0007). Docs consolidated into experiments/threshold/docs/.
```

- [ ] **Step 2: Commit**

```bash
git add experiments/threshold/.context/LOG.md
git commit -m "docs(threshold): log Phase 5 sprint completion"
```

---

## Graphify Update

### Task G1: Update the knowledge graph

**Files:** none (Graphify-managed state)

- [ ] **Step 1: Run Graphify update**

Invoke the graphify skill with the `--update` flag scoped to the Threshold experiment, so the knowledge graph reflects the new files (`SessionHud.tsx`), moved docs (`experiments/threshold/docs/`), expanded mood system, and new ADRs:

```
/graphify experiments/threshold --update
```

- [ ] **Step 2: Commit any graph output files it produces**

```bash
git add -A
git status
```

Review what Graphify wrote before committing — if it touched files outside `experiments/threshold/` unexpectedly, stop and investigate rather than committing blind.

```bash
git commit -m "chore(threshold): update Graphify knowledge graph for Phase 5"
```

---

## Merge to Main

### Task M1: Merge the sprint branch

**Files:** none (git operations)

- [ ] **Step 1: Run the full test suite one final time**

Run: `cd "/Users/abhishek/AI Musings/.worktrees/threshold-phase5-sprint" && npm test`
Expected: all tests pass, 0 failures.

- [ ] **Step 2: Merge into main**

```bash
cd "/Users/abhishek/AI Musings"
git checkout main
git merge threshold-phase5-sprint --no-ff -m "$(cat <<'EOF'
Merge threshold-phase5-sprint: render-mode fixes, mood/texture unification, legibility HUD, camera background, intro redesign

- Fix radio (single glow ring), ascii (real per-instance glyphs), spectral (FFT-driven)
- Add mood-driven color consistency and depth-driven proximity grid warp
- Expand mood cycle to 5 (add SOLAR, AZURE), unify texture/mood wiring
- Default to DEEP mood with BLOOM texture enabled
- Add legibility HUD, toggleable full-bleed camera background, CRT-styled intro screen
- 4 new ADRs (0004-0007), docs consolidated into experiments/threshold/docs/

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Run tests on main post-merge**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Remove the worktree**

```bash
git worktree remove .worktrees/threshold-phase5-sprint
```

(Only after confirming the merge succeeded and tests pass on `main` — the worktree's branch (`threshold-phase5-sprint`) is preserved in git history regardless of worktree removal.)

---

## Human Smoke-Test

### Task S1: Start the dev server

**Files:** none

- [ ] **Step 1: Start the dev server on main**

```bash
cd "/Users/abhishek/AI Musings" && npm run dev
```

Expected: server starts on `http://localhost:3002` (or `$PORT` if set). Report the URL to the user and hand off for human testing — do not stop the server automatically; leave it running for the user to test render modes, mood cycling, the camera background toggle, the intro screen, and the legibility HUD in-browser.

---

## Self-Review Notes

- **Spec coverage:** legibility HUD → Track C; radio/ascii/spectral fixes → Track A2-A4; color consistency → Track A1; intro screen → Task D3; camera PIP→background → Task D2; proximity/depth warp → Task A5; sound texture/mood expansion → Track B; Leva restyle/gesture labels → Task D4. All 9 design sections covered.
- **Process requirements:** worktree (Task 0) ✓, ADRs (4 tasks, 0004-0007) ✓, Graphify update (Task G1) ✓, new branch (`threshold-phase5-sprint`, Task 0) ✓, subagent-driven execution note in header ✓, phased/track-lettered (A/B/C/D matching Phase 3/4 convention) ✓, merge-to-main (Task M1) ✓, docs consolidation (Tasks DC1-DC2) ✓, dev server for smoke-testing (Task S1) ✓.
- **Explicitly out of scope, not included:** re-fixing the onboarding-dismiss crash (already fixed via `videoStreamAttacher.ts`) and the gesture/Leva sync bug (already fixed via the Phase 4 fast-forward merge) — neither appears as a task above.
- **Placeholder scan:** no "TBD"/"TODO"/"similar to Task N" patterns present; every code step shows complete, exact code against confirmed original file content.
- **Type/signature consistency:** `getMoodGradientColor(baseHue, brightness, target?)` used identically in Task A1 and Task A4; `moodTextureToSoundTexture(textureType)` used identically in Task B2 and ADR 0007; `wristProximityWarp(cellX, cellY, wrist, detected)` used identically in Task A5's test and implementation; `Mood` type's 5 values (`luminous`/`deep`/`pulse`/`solar`/`azure`) consistent across Task B1's type change, mood-config entries, and both `ThresholdView.tsx` array updates.
