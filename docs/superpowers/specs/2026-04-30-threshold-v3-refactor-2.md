# Spec: THRESHOLD V3 (Volumetric Terminal Instrument)

## 1. Overview
**THRESHOLD v3** is a volumetric terminal instrument that turns a webcam feed into a physical 3D topography of minimalist primitives. It bridges the gap between a flat, tactile "radio button" interface and a futuristic volumetric scanner.

## 2. Goals
- **Performance:** Maintain 60fps with a 64x64 grid (4,096 instances) by moving sampling to an efficient pipeline.
- **Tactility:** Preserve the "mechanical click" and threshold-based interaction from the working HTML version.
- **Volumetric Depth:** Use real-time brightness/depth data to drive physical extrusion in a 3D space.
- **Instrumentalism:** Deeply couple audio frequency data to both visual emissive intensity and physical height.

## 3. Architecture

### 3.1 Input & Sampling Pipeline
- **Webcam:** `useWebcam` hook provides a `VideoTexture`.
- **Sampler:** A hidden `OffscreenCanvas` (128x128) samples the `VideoTexture` to generate a `Float32Array` of brightness values. This avoids expensive `getImageData` calls on the main video element.
- **Zustand Store:** Manages:
    - `viewMode`: 'flat' (Top-down) | 'volumetric' (Perspective)
    - `threshold`: Brightness cutoff for "active" cells.
    - `extrusion`: Global Z-scale multiplier.
    - `audioReactive`: Toggle for audio-driven height.
    - `theme`: 'dark' | 'acid' | 'heatmap'

### 3.2 Rendering Engine (R3F)
- **InstancedMesh:** Uses `BoxGeometry` (Voxels) for the brutalist terminal aesthetic.
- **Camera:** `PerspectiveCamera` animated via `GSAP` or `framer-motion-3d` between:
    - **Flat:** `position: [0, 0, 15]`, `rotation: [0, 0, 0]`
    - **Volumetric:** `position: [10, -10, 15]`, `lookAt: [0, 0, 0]`
- **Materials:** `MeshStandardMaterial` with:
    - Matte black base.
    - High-intensity emissive "caps" (top faces) driven by cell activity and audio FFT.

### 3.3 Audio Engine (Tone.js)
- **Synth:** Polyphonic percussive clicks (MembraneSynth/FMSynth) triggered on threshold crossing.
- **FFT Analysis:** `Analyser` node provides real-time frequency data.
- **Reactive Height:** Low-end frequency amplitude is passed to the `Scene` to multiply the Z-scale of all active instances.

## 4. Interaction Design
- **Initialization:** An "INITIALIZE" screen to handle browser audio/camera permissions.
- **Toggle View:** A dedicated UI button and `Spacebar` key to swap between Flat and Volumetric views.
- **Threshold Control:** `Wheel` / `TouchDrag` to adjust the brightness threshold.
- **Leva GUI:** For "Hardware Workstation" style controls (Sensitivity, Volume, Theme).

## 5. Performance Targets
- **Resolution:** Default 64x64. Up to 128x128 for high-end machines.
- **Framerate:** Locked 60fps on modern hardware.
- **Memory:** Clean disposal of `VideoTexture`, `OffscreenCanvas`, and `Tone.js` nodes on unmount.

## 6. Implementation Stages
1. **Core Pipeline:** Fix `useWebcam` and `useSampler` to use `VideoTexture` + `OffscreenCanvas`.
2. **Brutalist Voxel Scene:** Implement `InstancedMesh` with `BoxGeometry` and reactive height logic.
3. **Camera States:** Add camera animation logic for 2D/3D transitions.
4. **Audio Integration:** Connect Tone.js clicks and FFT height coupling.
5. **Polishing:** Post-processing (Bloom, Scanlines) and UI styling.
