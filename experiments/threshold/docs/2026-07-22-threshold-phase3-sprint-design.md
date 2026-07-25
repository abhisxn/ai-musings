# Threshold — Phase 3: Sprint Design (Sound, Gesture-Reactive Controls, Onboarding, Version, Color Triage)

## Context

Phase 1 (complete) replaced fake motion detection with real MediaPipe hand-gesture tracking. Phase 2 (complete) reskinned all render modes/themes/UI chrome toward a dither/halftone brutalist look, unifying per-cell color onto a shared gradient model.

This phase, Phase 3, closes five gaps surfaced by a user pass over the live app after Phase 2 shipped:

1. Sound "barely plays / feels broken" — a functional audio bug, not a taste issue.
2. Detected hand gestures (`fist` / `open_palm` / `pinch`) are computed every frame but never drive anything beyond a status-text display — the onboarding copy's promise ("MAKE A FIST / OPEN PALM / PINCH FINGERS → TRIGGERS A MOMENT") is currently unimplemented.
3. Onboarding is a single overlay line, not a real walkthrough.
4. Boot screen reads `THRESHOLD V5`; user wants it to read `V6` to reflect Phase 2 as a version-worthy jump.
5. A claim that "only 1 render mode has multi-colors" needed live verification against Phase 2's code, which a prior research pass found already computes gradients for 6 of 7 modes.

Scope was locked in with the user via brainstorming Q&A:
- One combined Phase 3 sprint plan (not five separate specs), organized as sub-agent-owned parallel tracks — mirrors Phase 1/2's foundation → parallel worktree → review → merge shape.
- Color-mode claim gets a live triage step before any fix work is planned (code-level evidence already suggests it's not a real bug).
- Sound work is scoped to **reliability**, not remix/taste — confirmed as a functional bug.
- Gesture-reactivity means **both** live visual feedback in the Leva panel showing detected gesture, **and** gestures actually driving mode/theme/mood changes as a secondary control scheme.
- Onboarding becomes a multi-step guided walkthrough, replayable via a persistent icon.
- Version bump is a one-line cosmetic change, not a new versioning convention.

Explicitly out of scope: redesigning audio timbre/mix, a formal versioning policy, any new render-mode geometry (that was Phase 2).

## Current-state findings (grounding for this design)

From direct code inspection prior to this spec:

- **Gesture pipeline**: `src/vision/pinch.ts:18` defines `Gesture = 'fist' | 'open_palm' | 'pinch' | null`; `detectGestureEdge` (`pinch.ts:120`) reports a gesture only on the frame it's entered (one-shot/edge-triggered). `src/vision/useGestureTracking.ts:129-175` writes the resolved gesture into the store via `setHandTracking(...)` (line 166-174) — this is the only write point. `src/store.ts:136-143` holds `handTracking.gesture`. Today, `ThresholdView.tsx:146-149` only reads `handTracking.gesture` to build a status string; nothing else consumes it. `pinchDistance` (continuous, not the discrete gesture) separately drives `threshold` every frame (`ThresholdView.tsx:140-144`) — that path is unrelated and stays untouched.
- **Mode/theme change pattern to mirror**: `ThresholdView.tsx:206-229` — number keys 1-7 index into a `modeList` array via `setRenderMode(modeList[idx])`; `0` toggles `setMoodEnabled`; `m` cycles `currentMood` via an array + index. Leva panel (`ThresholdView.tsx:247-251`) wires the same setters via `onChange`. `modeList` and an equivalent theme list currently live inline in `ThresholdView.tsx`, not exported from `store.ts`.
- **Audio bugs** (`src/audio.ts`): three separate call sites (lines 135-137, 176-178, 201-203) do `await Promise.race([Tone.start(), timeout(500)])` — none check `Tone.context.state` afterward, so on a still-suspended `AudioContext` (unsatisfied browser autoplay gate) synth setup proceeds anyway and playback silently fails. Two independent effects (soundTexture effect, mood/phase effect) each race their own `Tone.start()` against the same shared context — a redundant, racy pattern. Rhythm hits allocate a new `MembraneSynth` per loop iteration and dispose it via `setTimeout(..., 500)` (lines 281-289) — time-based disposal unrelated to the actual note's release, which can drop hits under GC pressure or context-resume delay. No error/state surfaces anywhere; failures degrade silently.
- **Color-mode claim**: a prior research pass (Explore agent + `vitest run`) found `Scene.tsx:237` calls `getGradientColor(theme, brightness, cellColorScratch)` unconditionally per cell, fanned out to blocks/pixel/dots/lines/radio/spectral (6 of 7 modes); only `ascii` is deliberately excluded (tints via flat material color/emissive, not instanceColor — by design per Phase 2's own spec). This contradicts the "only 1 mode" claim at the code level — Phase 0b below re-verifies this live rather than trusting static analysis alone.

## Architecture: phased, sub-agent-owned, worktree-parallel

```
Phase 0 — Foundation + Triage (parallel; both gate Phase 1)
  0a. Foundation                     — architect+code agent
  0b. Color-mode live triage         — test/verify agent

Phase 1 — Parallel implementation (3 worktree tracks; code agents)
  Track A — Audio Engine Repair
  Track B — Gesture-Reactive Controls
  Track C — Onboarding Walkthrough + Version Bump
  (Track D — Color-mode fix, spawned only if 0b finds a real bug)

Phase 2 — Review + Synthesis
  Per-track code review (correctness) + cross-track synthesis (content
  dependency: onboarding copy must describe Track B's new behavior)

Phase 3 — Verification (test/verify agent, live app via `run` skill)

Phase 4 — Merge (finishing-a-development-branch)
```

### Phase 0a — Foundation

Export `RENDER_MODES` and `THEMES_LIST` as ordered arrays from `store.ts` (currently the `modeList` equivalent is inline in `ThresholdView.tsx`). Both the existing keyboard-shortcut cycling and the new gesture-control hook (Track B) need one shared source of truth for "next mode"/"next theme" — this prevents Track B from either duplicating the array or reaching into `ThresholdView.tsx` internals. Pure, additive, no behavior change to existing keyboard shortcuts (they switch to importing the same array).

### Phase 0b — Color-mode live triage

Run the dev server (via the `run` skill), cycle all 7 render modes × 4 themes, and confirm directly whether multi-color gradients render for the 6 modes the code claims support them. Produces a go/no-go: if the claim holds (matches the prior static-analysis finding), Track D is skipped and this phase's output is simply a documented confirmation. If a real rendering bug is found (e.g., a runtime issue static analysis wouldn't catch — texture not loading, wrong uniform, etc.), Track D is scoped then, isolated to whatever the live triage actually finds.

### Track A — Audio Engine Repair (`src/audio.ts` only, isolated)

- Replace the three racing `Tone.start()`/timeout calls with one shared `ensureAudioContext()` gate that awaits actual context resume (checks `Tone.context.state === 'running'`) rather than racing a fixed timeout, called once from the existing Leva "Audio > enabled" toggle — the one spot in the app with a confirmed real user gesture to satisfy the browser autoplay policy.
- Both the soundTexture effect and the mood/phase effect stop independently calling `Tone.start()`; they instead check the shared gate.
- Replace the per-rhythm-hit `MembraneSynth` create/dispose churn with a single reused synth instance, removing the time-based disposal race that drops notes.
- No changes to instrument choice, timbre, envelope design, or mix — scoped to reliability only, per user confirmation this is a functional bug, not a taste issue.

### Track B — Gesture-Reactive Controls (new `useGestureControls.ts` + additive `store.ts` + one Leva monitor row)

Mapping (edge-triggered, reusing the existing one-shot `detectGestureEdge` semantics so a held gesture doesn't rapid-fire):

| Gesture | Action |
|---|---|
| FIST | cycle to next render mode (Phase 0a's `RENDER_MODES`) |
| OPEN PALM | cycle to next theme (Phase 0a's `THEMES_LIST`) |
| PINCH | toggle mood on/off (`setMoodEnabled`) |

New, isolated `useGestureControls.ts` hook watches `handTracking.gesture` and calls the existing `setRenderMode`/`setTheme`/`setMoodEnabled` store setters — no new state shape, just a new consumer of the existing write point at `useGestureTracking.ts:166-174`.

Live visual feedback: one additional read-only Leva monitor row (existing `useControls` idiom, same pattern as the panel's other folders) bound to `handTracking.gesture` / `gestureTrackingStatus`, so the panel visibly reflects the gesture that just fired and, implicitly, the setting it changed (since the mode/theme/mood controls in the same panel update live).

### Track C — Onboarding Walkthrough + Version Bump

Extract the current single-line onboarding overlay (`ThresholdView.tsx`'s inline JSX block, currently gated by a `localStorage` flag at line 162) into a new `OnboardingOverlay.tsx` component, sequenced as:

1. What Threshold is (one line)
2. Camera/gesture permission context
3. Try FIST / OPEN PALM / PINCH — live detection feedback per step, reusing the existing per-gesture swatch colors (green/cyan/orange) preserved from Phase 2 as semantic, not theme-driven
4. Gestures now also cycle modes/themes/mood (documents Track B's new behavior — this is the cross-track content dependency Phase 2 synthesis must catch)
5. Modes & themes exist — press 1-7, T (documents pre-existing keyboard shortcuts)
6. Dismiss → same `localStorage` flag as today, plus a persistent "?" icon to replay the sequence on demand

Version bump: `THRESHOLD V5` → `THRESHOLD V6` (`ThresholdView.tsx:284`), bundled into this track since it's the same boot-screen chrome region already being touched.

## Cross-track dependency (why Phase 2 exists as a distinct step)

Tracks B and C are independently implementable (different files: a new hook module vs. a new component + one boot-screen line), but C's onboarding step 4 describes B's behavior. This is a **content** dependency, not a file conflict — Phase 2's synthesis pass exists specifically to catch it (e.g., if Track B's final gesture mapping differs from what step 4 says). No merge conflict is expected since B and C touch different files/regions of `ThresholdView.tsx`.

## Testing strategy

- **Track A**: no meaningful unit test surface (real `AudioContext`/browser autoplay gate) — verified live in Phase 3 by actually toggling audio on and confirming sustained, non-dropped playback across a texture switch and a mood change.
- **Track B**: the gesture→next-mode/theme cycling logic is a pure function (given current mode/theme + which gesture fired, return the next value) — unit-testable alongside the existing `theme.test.ts`/`dither.test.ts` pattern in `src/__tests__/`.
- **Track C**: no logic to unit test; manual walkthrough-step verification only.
- **Phase 0b and Phase 3** both use the `run` skill to drive the actual dev server rather than relying on static code review alone — this is the same lesson Phase 0b itself is applying (a prior static-analysis-only conclusion needs live confirmation).

### Critical files

- `experiments/threshold/src/store.ts` (Phase 0a: export `RENDER_MODES`/`THEMES_LIST`)
- `experiments/threshold/src/audio.ts` (Track A)
- `experiments/threshold/src/useGestureControls.ts` (new, Track B)
- `experiments/threshold/src/vision/useGestureTracking.ts` (Track B, reference only — existing write point, not modified)
- `experiments/threshold/src/ThresholdView.tsx` (Track B: one hook call + one Leva monitor row; Track C: swap onboarding JSX for `OnboardingOverlay.tsx` import + version-string line)
- `experiments/threshold/src/OnboardingOverlay.tsx` (new, Track C)
- `experiments/threshold/src/__tests__/` (new gesture-cycling unit test, Track B)
