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
[2026-05-01] [REFACTOR] Done — Isolated internal logic (audio, hooks, store, scene) into `src/` subfolder.
[2026-05-01] [REFACTOR] Done — Extracted UI to `ThresholdView.tsx` and simplified `index.tsx` entry point.
[2026-05-01] [CLEANUP] Done — Removed legacy `.html` files and backups from `experiments/` and `public/`.
[2026-05-01] [DOCS] Done — Updated `README.md`, `BRIEF.md`, `STACK.md`, and `LOG.md` to reflect new architecture.
[2026-07-20] [PHASE2] Done — Visual-language redesign (spectral/dither reskin). New `src/theme.ts` (single source of truth: THEMES palette, `getGradientColor` multi-stop lerp driving per-cell color for ALL 4 themes — replaces heatmap-only `getHeatmapColor`; `PHASE_COLORS` consolidated) and `src/dither.ts` (pure `bayerMatrix` + `generateDitherAtlas`/`generateHalftoneDotAtlas`/`generateSpectralSprite` canvas textures, sibling to `blue-noise.ts`). Scene.tsx reskin: pixel/blocks(ring)/dots/lines use Bayer/halftone atlases, spectral gets soft sprite, new `lines` render mode replaces `particles` (thin-footprint brightness-stretched bars). Unified white-base + per-instance `instanceColor` gradient model across all modes; mood stays orthogonal via `chromeColor` emissive. ThresholdView.tsx: Leva brutalist theming (mono/square/1px) + surgical chrome paletteization (semantic gesture/mood/error colors preserved). Fixes pointLight ignoring light/heatmap themes. 19 new unit tests (82 total). Executed via subagent-driven parallel worktree framework (foundation → parallel Task A/B → review → merge).
[2026-07-20] [PHASE2] Done — Review follow-ups: Leva folder/tooltip colors themed, ascii material tinted chrome (plan §3 fidelity), pointLight uses `palette.accent`.
[2026-07-22] [PHASE3] Done — Five-track sprint: (A) audio engine repair — shared `ensureAudioContext()` gate (awaits real context resume, not 500ms race) + single reused MembraneSynth (no per-hit churn); (B) gesture-reactive controls — new `useGestureControls.ts` hook: FIST→cycle render mode, OPEN_PALM→cycle theme, PINCH→toggle mood, edge-triggered via `detectGestureEdge` one-shot semantics + Leva monitor row + 32 unit tests (pure cycle fns + hook edge-detection); (C) onboarding walkthrough — 6-step `OnboardingOverlay.tsx` + `onboardingSteps.ts` data, localStorage-gated, persistent '?' replay icon, V5→V6 boot-screen bump; (E1) 3D polish — cool rim directionalLight, sine-drifting pointLight, fog, seeded phosphor flicker (±3%), post-fx order Bloom→HueSaturation→ChromaticAberration→DepthOfField→Glitch→Scanline→Noise→Vignette, Glitch driven by `gestureGlitchActive`; (E2) chrome polish — 6-tier typography scale (`threshold.module.css`, CSS-Modules scoped), tick-mark corner rulers, signal-strength bar (5-seg), hand-position targeting reticle with per-gesture swatch pulse, VHS glitch trigger (`setGestureGlitchActive`), neon-glow accents, `VISUAL_STYLEGUIDE.md`. Foundation: `RENDER_MODES`/`THEMES_LIST` exported as shared source of truth from `store.ts`; `gestureGlitchActive` shared store field (E2 writes, E1 reads). Color-mode claim ("only 1 mode has multi-color") refuted — 6/7 modes use gradient `instanceColor`/vertex colors by design. Integrated: OnboardingOverlay wired to E2 module classes (21 hook→module refs). 114 total tests pass. Executed via subagent-driven parallel worktree framework (Stage 0 foundation/triage → 5 parallel worktree tracks → two-stage spec+quality review → merge A,B,C,E1,E2 with B-after-A/E2-after-C rebases → integrated verification).
[2026-07-26] [PHASE5] Done — fixed the 3 weak render modes (A): radio now draws one brightness-driven glow ring instead of ring+dot, ascii renders real per-instance glyphs via UV-offset shader patch, spectral is FFT-bin-driven instead of pixel-brightness; added mood-driven color consistency and a depth-driven proximity grid warp around the tracked wrist; expanded mood cycle to 5 (B): LUMINOUS/DEEP/PULSE/SOLAR/AZURE, unified sound-texture wiring across the build effect and trigger functions, defaulted to DEEP mood with BLOOM texture enabled; added a corner-anchored legibility HUD (C) explaining mode/theme/ARC/texture in plain language; redesigned the intro screen with CRT/bracket framing, replaced the webcam PIP with a toggleable full-bleed background layer, and clarified the Leva gesture-status label (D). 4 new ADRs (0004-0007). Docs consolidated into experiments/threshold/docs/.
