# Stack — Threshold V3 (Volumetric)

## Delivery Format

Next.js 15 + React 19 Component.
Path: `experiments/threshold/index.tsx` (Entry) -> `src/ThresholdView.tsx` (Logic)
Integration: Embedded via `app/experiments/[slug]/page.tsx`.
URL: `/musings/experiments/threshold/`

## Core Engine

- **React Three Fiber (R3F):** High-performance React renderer for Three.js.
- **Three.js:** Underlying 3D engine for scene management and instanced rendering.
- **Drei:** Helper library for R3F (shaders, textures, camera controls).

## Rendering & Shaders

- **InstancedMesh:** Used to render 10,000+ individual units (radio buttons, blocks, or particles) at 60fps.
- **Custom GLSL Shaders:** All image processing (threshold, edge, ghosting) moved to Fragment Shaders.
- **Post-Processing:** `react-postprocessing` for scanlines, bloom, and terminal chromatic aberration.

## Depth & AI

- **Transformers.js (Depth Anything):** Real-time AI depth estimation to convert 2D webcam feed into a 3D topographical map.
- **MediaPipe:** Optional fallback for high-fidelity face/hand 3D tracking.

## Audio

- **Tone.js 15+:** Integrated via custom React hooks (`useAudioEngine`).
- **Dynamic Synth Coupling:** Swaps synth profiles (Chimes, Bells, Pulse, Sine) based on user state.
- **Pitch Mapping:** Real-time note selection from a C Major Pentatonic scale mapped to pixel vertical coordinates.
- **FFT Analysis:** Audio data passed to shaders as uniforms for music-reactive visuals.

## State Management

- **Zustand:** For high-frequency frame-loop state (slider values, audio levels) to avoid React re-renders.
- **Leva:** Professional GUI for hardware-style control panel in development/experimentation.

## Performance

- **WebGPU:** Targeted for scale where available (Three.js r171+).
- **VideoTexture:** Direct webcam-to-shader pipeline to bypass CPU pixel looping.

