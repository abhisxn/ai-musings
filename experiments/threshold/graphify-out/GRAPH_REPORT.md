# Graph Report - experiments/threshold  (2026-07-27)

## Corpus Check
- 39 files · ~47,742 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 104 nodes · 78 edges · 35 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]

## God Nodes (most connected - your core abstractions)
1. `toErrorWorkerMessage()` - 4 edges
2. `applyGestureEdge()` - 4 edges
3. `moodTextureToSoundTexture()` - 3 edges
4. `MarkovMelody` - 3 edges
5. `bayerMatrix()` - 3 edges
6. `handleFrame()` - 3 edges
7. `createStreamAttacher()` - 2 edges
8. `useAudio()` - 2 edges
9. `nextRenderMode()` - 2 edges
10. `nextTheme()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `useWebcam()` --calls--> `createStreamAttacher()`  [INFERRED]
  experiments/threshold/src/hooks.ts → experiments/threshold/src/videoStreamAttacher.ts
- `useAudio()` --calls--> `moodTextureToSoundTexture()`  [INFERRED]
  experiments/threshold/src/audio.ts → experiments/threshold/src/mood-config.ts
- `moodTextureToSoundTexture()` --calls--> `resolveEffectiveTexture()`  [INFERRED]
  experiments/threshold/src/mood-config.ts → experiments/threshold/src/__tests__/audio.test.ts
- `nextRenderMode()` --calls--> `applyGestureEdge()`  [INFERRED]
  experiments/threshold/src/useGestureControls.ts → experiments/threshold/src/__tests__/useGestureControlsHook.test.ts
- `nextTheme()` --calls--> `applyGestureEdge()`  [INFERRED]
  experiments/threshold/src/useGestureControls.ts → experiments/threshold/src/__tests__/useGestureControlsHook.test.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (3): resolveEffectiveTexture(), useAudio(), moodTextureToSoundTexture()

### Community 1 - "Community 1"
Cohesion: 0.32
Nodes (4): nextMoodEnabled(), nextRenderMode(), nextTheme(), applyGestureEdge()

### Community 2 - "Community 2"
Cohesion: 0.39
Nodes (5): handleFrame(), handleInit(), toErrorMessage(), toErrorWorkerMessage(), toHandGestureResults()

### Community 3 - "Community 3"
Cohesion: 0.29
Nodes (2): clamp(), normalizePinchDistance()

### Community 4 - "Community 4"
Cohesion: 0.33
Nodes (2): useWebcam(), createStreamAttacher()

### Community 5 - "Community 5"
Cohesion: 0.47
Nodes (3): bayerMatrix(), generateBayerDitherAtlas(), generateDitherAtlas()

### Community 6 - "Community 6"
Cohesion: 0.4
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 0.4
Nodes (0): 

### Community 8 - "Community 8"
Cohesion: 0.4
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 0.5
Nodes (1): MarkovMelody

### Community 10 - "Community 10"
Cohesion: 0.67
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 0.67
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 12`** (2 nodes): `index.tsx`, `ThresholdExperiment()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (2 nodes): `levaSync.ts`, `buildLevaSyncPayload()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `generateBlueNoiseTexture()`, `blue-noise.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `SessionHud.tsx`, `SessionHud()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `useEnergyAccumulator.ts`, `useEnergyAccumulator()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `Scene.tsx`, `Scene()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `gesture-worker.test.ts`, `makeLandmarks()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `theme.test.ts`, `roundRgb()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `meta.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `shaders.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `onboardingSteps.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `store.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `wrist-mapping.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `pinch.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `levaSync.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `store.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `gestureControls.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `types.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `onboarding.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `videoStreamAttacher.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `dither.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `mood-config.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 3 inferred relationships involving `applyGestureEdge()` (e.g. with `nextRenderMode()` and `nextTheme()`) actually correct?**
  _`applyGestureEdge()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `moodTextureToSoundTexture()` (e.g. with `useAudio()` and `resolveEffectiveTexture()`) actually correct?**
  _`moodTextureToSoundTexture()` has 2 INFERRED edges - model-reasoned connections that need verification._