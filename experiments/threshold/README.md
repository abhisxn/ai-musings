# Threshold v3

## Design POV
A volumetric terminal instrument that transforms real-time webcam feeds into 3D topography using AI depth estimation, blending monospace aesthetics with high-fidelity WebGL rendering.

## Architecture
This experiment is built with:
- **Next.js (React)** for the application wrapper.
- **Three.js (React Three Fiber)** for the 3D volumetric rendering.
- **Tone.js** for the audio synthesis and frequency analysis.
- **Zustand** for real-time state management between the HUD and the 3D scene.
- **Transformers.js** for client-side AI depth estimation (`Xenova/depth-anything-small-hf`).

## Structure
Internal logic is isolated in the `src/` directory:
- `audio.ts`: Tone.js setup and lifecycle.
- `hooks.ts`: Webcam capture and AI model sampling.
- `store.ts`: Central state for parameters and UI.
- `Scene.tsx`: The main 3D rendering loop and geometry instances.
- `ThresholdView.tsx`: The primary React component and HUD integration.
