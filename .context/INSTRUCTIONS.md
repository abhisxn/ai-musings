# Build Instructions

## Folder Structure
ai-musings/
├── .context/           ← project brain (never delete, always update)
├── CLAUDE.md           ← Claude Code entry point
├── GEMINI.md           ← Gemini CLI entry point
├── AGENTS.md           ← universal project brief
├── app/
│   └── musings/
│       └── [slug]/
│           └── page.tsx    ← Next.js route per experiment
├── experiments/
│   └── [slug]/
│       ├── index.tsx       ← experiment component
│       ├── sketch.js       ← p5.js or vanilla logic (if applicable)
│       └── README.md       ← design POV + build notes
├── shared/
│   └── components/         ← reusable UI (nav, wrappers, etc.)
├── public/
└── package.json


## Naming Conventions
- Experiment slugs: kebab-case. e.g. `colour-torture`, `physics-raga`, `droodles`
- Components: PascalCase. e.g. `ColourTorture.tsx`
- Utility files: camelCase. e.g. `audioEngine.js`
- No abbreviations in file names. Spell it out.

## Experiment Structure
Each experiment lives in `experiments/[slug]/`. It must have:
- `index.tsx` — the React component that wraps the experiment
- A design POV in `README.md` — minimum one sentence, mandatory

Single-file experiments (vanilla JS): can live as one file if no React needed.
Use CDN imports for p5.js, Three.js, Tone.js in single-file experiments.

## Deployment
- Platform: Vercel
- Push to main → auto-deploys
- Live URL pattern: thatguyabhishek.com/musings/[slug]
- No manual deploy steps needed after first setup

## Code Style
- No TypeScript strict mode enforcement for experiments — keep it loose
- Comments explain intent, not syntax
- TODOs are okay and expected in experiments
- Don't over-abstract — this is creative code, not production code

## Starting a New Experiment
1. Create folder: `experiments/[slug]/`
2. Create `experiments/[slug]/README.md` with design POV
3. Create `experiments/[slug]/index.tsx` with skeleton
4. Create `app/musings/[slug]/page.tsx` importing the component
5. Test locally with `npm run dev`
6. Push → Vercel deploys automatically

## Context Hygiene Rules (Multi-Model)

These rules apply regardless of which AI tool is being used (Claude, Gemini, Kilocode, etc.):

1. After any task, append a dated line to the nearest LOG.md (project or experiment level).
   Format: `[YYYY-MM-DD] [SECTION] Done — [decision or note]`
2. `content/experiments/[slug]/meta.ts` is the only source of truth for structured facts (tags, status, series, type, date). Never duplicate these in markdown.
3. `BRIEF.md` is written once at experiment creation. Only update it if the concept pivots significantly.
4. `STACK.md` is updated when a tech decision changes — not after every session.
5. `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` are routing files only — never store facts in them.
6. When switching AI tools mid-experiment, read LOG.md first to understand the current state.