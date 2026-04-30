# Threshold V3 (Volumetric)

## WHO YOU ARE BUILDING FOR

Abhishek Saxena. Senior product designer, 12+ years. Vibe coder — prompts only, never writes code manually.
Building AI Musings: creative web experiments at thatguyabhishek.com/musings.
Reference energy: MSCHF × early Flash web × Yugo Nakamura × Ryoji Ikeda.

## FOLDER STRUCTURE

```text
experiments/threshold/
├── .context/           # Brief, Stack, Log
├── src/                # Isolated logic
│   ├── audio.ts        # Tone.js engine
│   ├── hooks.ts        # Webcam & AI sampling
│   ├── store.ts        # Zustand state
│   ├── Scene.tsx       # R3F components
│   └── ThresholdView.tsx # Main UI component
├── index.tsx           # Entry point
├── meta.ts             # Metadata
└── README.md           # Design POV
```

## WHAT THIS EXPERIMENT IS

**THRESHOLD v3** — a volumetric terminal instrument. It uses AI depth estimation to turn your webcam feed into a physical 3D topography of radio buttons, ASCII symbols, and block characters.
It's no longer just a flat grid; it's a living, breathing scan of your environment.

Experiment type: Type 3 (Absurdist Repurposing) + Type 5 (Volumetric Perception).
The 3D point cloud is the anchor. Every "cell" exists in 3D space, extruding and reacting to depth.

## AESTHETIC

- High-fidelity Terminal: 4K scanlines, chromatic aberration, and volumetric bloom.
- Monospace hardware aesthetic. Share Tech Mono.
- Dark / Acid / Heatmap themes.
- The UI (Leva) should feel like a specialized laboratory workstation.

## RENDER MODES

- **Radio Volumetric:** A massive grid of 3D radio buttons that physically depress/extrude based on depth.
- **ASCII Cloud:** A 3D field of characters floating in space.
- **Block Voxel:** A brutalist landscape of 3D cubes.
- **Particle Flow:** 100,000+ points of light reacting to both depth and audio frequency.

## FILTER MODES

- **Depth-Mapped:** Visuals reactive to physical distance from camera.
- **Sobel Edge:** 3D edges glowing in dark space.
- **Ghost Trails:** Temporal persistence where movement leaves a 3D wake.

## CONTROLS

- **Depth Sensitivity:** Tune the AI's Z-axis extrusion.
- **Resolution:** Scale from "Lo-Fi DOM" (36x22) to "Ultra WebGL" (200x120).
- **Audio Coupling:** Link synth frequency to depth or pixel brightness.
- **Camera Fly-through:** Ability to tilt/rotate the entire 3D grid.

## HARD RULES — NEVER VIOLATE

1. No backend. No auth. Fully client-side AI and rendering.
2. Tone.js is the only audio library. Use it for both generation and FFT analysis.
3. Performance is king. If it drops below 60fps, reduce resolution or optimize shaders.
4. The "Vibe" must remain Monospace/Terminal. Avoid "Generic 3D" look.
5. All depth processing must happen in real-time. No static pre-processing.

