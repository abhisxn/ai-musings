# ADR 0013 — GPU thermal guard layer

## Status

Accepted (Phase 7 — Track A).

## Context

Threshold drives a GPU-heavy real-time pipeline: up to 8 post-processing
passes (Bloom, HueSaturation, ChromaticAberration, DepthOfField, Glitch,
Scanline, Noise, Vignette), 9 instanced meshes each rendering resolution²
instances (4 096 cells at default 64×64), four concurrent `requestAnimationFrame`
loops (`useWebcam` stream attachment, `useSampler` pixel-diff, `useMotionZones`
fallback, `useEnergyAccumulator`), and a live MediaPipe hand-tracking worker.
On integrated graphics or low-memory devices this combination can exceed the
16.67 ms / 60 fps frame budget, causing thermal runaway, fan noise, dropped
frames, and — in extreme cases — tab-kill by the browser.

Existing mitigation is manual only (the user can lower the resolution slider).
There is no programmatic safety net that adapts in real time to the host
device's capabilities.

The Phase 7 sprint design (see
`experiments/threshold/docs/2026-08-03-threshold-phase7-sprint-plan.md`)
calls for a thermal guard layer that:

1. Detects device capability via the Navigator API.
2. Estimates per-frame GPU cost from structural counts (post-process passes,
   instance meshes, rAF loops) and the live resolution setting.
3. Classifies risk as `low` | `medium` | `high`.
4. Auto-downgrades quality when risk is `high`.
5. Exposes a manual override toggle so power users can bypass auto-downgrade.

## Decision

### Detection method

A new `useThermalGuard()` hook (`src/useThermalGuard.ts`) reads two
`navigator` properties that are stable across a session:

| Property                  | Type             | Meaning                                  |
| ------------------------- | ---------------- | ---------------------------------------- |
| `navigator.deviceMemory`  | `number\|null`   | Approximate RAM in GB (Chrome/Edge only).|
| `navigator.hardwareConcurrency` | `number\|null` | Logical CPU thread count.                |

Both are optional / may be `null` when the browser doesn't expose them
(Firefox, Safari, or privacy-hardened contexts). The hook degrades
gracefully: a `null` device memory does not inflate risk on its own.

### Cost model

The GPU frame cost is estimated by a pure, exported function
`estimateFrameMs(params)` that sums a deterministic per-component budget:

```
frameMs = BASE_FRAME_MS              (1.5 ms — base compositing)
        + MS_PER_POSTPROCESS_PASS    (0.7 ms × postProcessCount)
        + MS_PER_INSTANCE_MESH       (0.5 ms × instanceMeshCount × resolutionFactor)
        + MS_PER_RAF_LOOP            (1.2 ms × rAFLoopCount)
```

`resolutionFactor = resolution / 64` (the default resolution). This means
vertex-processing cost scales quadratically with cell count while the
post-process and loop costs remain linear.

At the Phase 7 baseline (resolution 64, 8 passes, 9 meshes, 4 loops) the
estimate is ~22 ms — above the 12 ms "high" threshold and above the 16.67 ms
60 fps budget, which correctly flags the baseline as thermally risky.

### Risk classification

`classifyRisk(frameMs, deviceMemoryGB)` takes the **worst** of two axes:

| Axis           | high                 | medium                | low                       |
| -------------- | -------------------- | --------------------- | ------------------------- |
| Frame cost     | > 12 ms              | > 8 ms                | ≤ 8 ms                    |
| Device memory  | < 4 GB               | 4–8 GB                | ≥ 8 GB (or null/unknown)  |

`null` device memory contributes no risk — the hook falls back to the
frame-cost axis alone.

### Auto-downgrade rules

The detection result is surfaced through the store (`thermalRisk`,
`reducedQuality`, `autoDowngradeEnabled`). When `autoDowngradeEnabled` is
`true` (the default) and `thermalRisk === 'high'`, the hook's consumer in
`ThresholdView.tsx` sets `reducedQuality = true` and emits a `console.warn`
so the activation is visible in the dev console without interrupting the
user. `reducedQuality` is consumed by Track C (post-process tiering and
conditional mesh mounting); Track A only sets the flag and renders the HUD.

### Manual override

A toggle button in the top-left thermal HUD displays `AUTO` or `MANUAL`:

- **AUTO** (default): the safety layer is active; `reducedQuality` is set
  automatically when risk is high.
- **MANUAL**: the safety layer is disabled; the user takes full control of
  quality settings. The `reducedQuality` flag is not auto-set.

Toggling does not immediately change `reducedQuality` — it only gates future
auto-downgrade decisions.

### Visual indicator

A compact HUD element (`.hudThermal` CSS class, composing `.hudMicro`)
renders at the top-left of the canvas when the main scene is mounted:

```
THERMAL // HIGH   22.4ms · 4GB   MANUAL
```

The risk label is colour-coded: green (low), amber (medium), red (high).

## Consequences

- **Safety net**: low-end / integrated-GPU devices that previously
  thermally throttled or crashed now get automatic quality reduction.
- **Transparency**: the `console.warn` and visual HUD make the safety
  layer's activation observable without hidden behaviour.
- **Escape hatch**: the AUTO/MANUAL toggle lets power users override.
- **Non-invasive**: Track A does not modify any existing render-mode logic,
  post-processing shader code, or scene geometry. It only adds a detection +
  flag-setting layer. The actual quality reduction is wired by Track C.
- **Forward-compatible**: the hook accepts `Partial<ThermalGuardParams>` so
  that when Track B reduces `rAFLoopCount` from 4 → 1 and Track C reduces
  `postProcessCount` from 8 → 3 and `instanceMeshCount` from 9 → 1, the
  estimate automatically reflects the improved baseline without code changes.

## Alternatives considered

- **Use the W3C Battery Status API** (`navigator.getBattery`) to infer
  thermal throttling. Rejected: the Battery Status API is deprecated in
  many browsers and does not directly predict GPU thermal load.
- **Use `performance.measureUserAgentScale`** or `WebGL_renderingContext`
  extension queries to detect GPU class. Rejected: unreliable across
  browsers and requires a live GL context before detection is possible.
- **Rely solely on `deviceMemory`** without the cost model. Rejected: two
  devices with identical RAM can have vastly different GPU capabilities;
  the cost model provides a resolution- and effect-aware estimate.
