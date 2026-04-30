# Threshold V2

## WHO YOU ARE BUILDING FOR

Abhishek Saxena. Senior product designer, 12+ years. Vibe coder — prompts only, never writes code manually.
Building AI Musings: creative web experiments at thatguyabhishek.com/musings.
Reference energy: MSCHF × early Flash web × Yugo Nakamura.

## WHAT THIS EXPERIMENT IS

**THRESHOLD v2** — a camera-fed terminal instrument that lets users tune how it sees them.
Not a demo. A machine that's already been watching — you're just changing its settings.

Experiment type: Type 3 (Absurdist Repurposing) + Type 4 (Perceptual Wit).
The radio button grid is the anchor concept. Every other mode is a lens on the same idea.

## AESTHETIC

- Monospace terminal aesthetic throughout. Share Tech Mono.
- Dark by default. Light theme available.
- Minimal chrome. Controls hidden behind a pull-up panel.
- Scanline overlay. Corner brackets. Glitch flash on mode switch.
- The UI should feel like equipment, not an app.

## RENDER MODES

Four modes for how the camera signal is drawn: radio buttons, ASCII, block characters, particle dots.

## FILTER MODES

Five filters applied to brightness signal before rendering: threshold, heatmap, negative, edge, ghost.

## CONTROLS

Threshold slider (10–245), delay/lerp smoothing (0–90), decay hold time (0–3000ms).
Temperature palette: cool / neutral / warm / acid — shifts the "on" colour.
Sound mode: click / tone / static / pulse / mute — Tone.js, triggered on cell state change.

## HARD RULES — NEVER VIOLATE

1. No backend. No auth. No database. Fully self-contained.
2. Every feature must work without breaking the others. State machine, not spaghetti.
3. Tone.js is the only audio library. No Web Audio API directly unless Tone can't do it.
4. No console.log spam in shipped code. Comments explain intent, not syntax.
5. After each section is built, test it before proceeding.
6. Check STACK.md before choosing implementation format — delivery format is decided there, not here.

## AGENT BEHAVIOUR

- Read BRIEF.md, STACK.md, and LOG.md before writing any code. These three files are the full context.
- Build section by section. Log each completed section to LOG.md: `[SECTION] Done — [any decision made]`.
- If a design decision is ambiguous, default to the simpler implementation and log it.
- Never redesign what's already decided. Execute what's specified.
- Ask zero clarifying questions. The spec is complete. Build it.
