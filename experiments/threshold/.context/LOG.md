# Log

Decision log for this experiment.

[2026-04-30] [ARCH] Done — Upgraded to Threshold V3: React Three Fiber + Volumetric Rendering + AI Depth Estimation.
[2026-04-30] [STACK] Done — Installed Three.js, R3F, Zustand, Tone.js, Leva, Transformers.js.
[2026-04-30] [ROUTING] Done — Connected React component to /experiments/threshold route.
[2026-04-30] [WEBCAM] Done — Implemented useWebcam hook for real-time video capture.
[2026-04-30] [AI] Done — Integrated Transformers.js with 'depth-anything-small-hf' for real-time depth estimation.
[2026-04-30] [SCENE] Done — Connected depth data buffer to InstancedMesh rendering loop.
[2026-04-30] [MODES] Done — Implemented Radio, Blocks, and Particles render modes using InstancedMesh.
[2026-04-30] [AUDIO] Done — Integrated Tone.js with FFT analysis and PolySynth coupling.
[2026-04-30] [THEME] Done — Added dynamic color themes (Dark, Light, Acid, Heatmap).
[2026-04-30] [FX] Done — Implemented high-fidelity post-processing (Bloom, Chromatic Aberration, Scanlines, Noise, Vignette).
[2026-04-30] [HUD] Done — Added terminal-style HUD overlays and corner brackets.
[2026-04-30] [POLISH] Done — Refined materials (emissive/metallic) and added subtle micro-animations to the volumetric grid.
[2026-04-30] [AUDIO] Done — Expanded audio engine with Chimes (FM Synth) and Bells (AM Synth) profiles.
[2026-04-30] [RENDER] Done — Implemented explicit 'Radio' mode with physical button depression/pop logic; added 'Dots' mode.
[2026-04-30] [FILTER] Done — Added 'Inverse' functionality for flipping the depth signal extrusion.
[2026-04-30] [AUDIO] Done — Implemented real-time FFT audio-reactivity; grid extrusion and emissive glow now pulse to the sound.
[2026-04-30] [ASCII] Done — Created high-performance ASCII shader pipeline using a dynamic character texture atlas.
[2026-04-30] [REFACTOR] Done — Pivoted from AI Depth Estimation (too slow) to high-speed Real-Time Pixel Sampling (60fps mirror functionality).
[2026-04-30] [PERF] Done — Implemented pixel-to-luminance mirror filter for immediate visual feedback.
[2026-04-30] [CAMERA] Done — Implemented AnimatedCamera for smooth lerp transitions between flat and volumetric views; added spacebar shortcut.
[2026-05-01] [FIX] Done — Restored Radio mode 2D logic; fixed Blocks mode 3D volumetric extrusion.
[2026-05-01] [RENDER] Done — Implemented "Spectral" render mode (House of Cards aesthetic) using unskinned point clouds with temporal shimmer and additive blending.
[2026-05-01] [THEME] Done — Redesigned "Heatmap" theme with a full multi-chromatic spectral gradient (Blue → Red).
[2026-05-01] [UI] Done — Added user-controlled "Gridlines" toggle in the View panel; subtilized grid visuals.
[2026-05-01] [AUDIO] Done — Fixed sound type switching bug; implemented vertical pitch-mapping using a C Major Pentatonic scale for more expressive audio feedback.
[2026-05-01] [STABILITY] Done — Resolved all syntax and TypeScript errors; verified project integrity with tsc check.
