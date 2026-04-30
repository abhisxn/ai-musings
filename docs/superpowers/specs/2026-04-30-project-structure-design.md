# AI Musings — Project Structure Design
_Date: 2026-04-30_

## Context

AI Musings is a personal collection of interactive AI/creative experiments (audio, vision, generative) deployed at `thatguyabhishek.com/musings`. Currently the experiments are self-contained HTML files using vanilla JS + CDN libraries (p5.js, Three.js, Tone.js). The goal is to establish a robust, scalable Next.js + Vercel structure that:

- Supports a gallery grid with tag + series filtering
- Runs cleanly across multiple AI coding tools (Claude, Gemini CLI, Kilocode+OpenRouter) without context rot
- Accommodates legacy HTML experiments (via iframe) and new React-component experiments
- Deploys as a standalone Vercel project routed under `thatguyabhishek.com/musings`

---

## Folder Structure

```
/
├── app/
│   ├── layout.tsx                        # root layout: font, metadata, nav
│   ├── page.tsx                          # redirects to /experiments
│   ├── globals.css
│   └── experiments/
│       ├── page.tsx                      # gallery grid with tag + series filters
│       └── [slug]/
│           ├── page.tsx                  # single experiment view
│           └── embed/
│               └── page.tsx             # fullscreen iframe-only (no nav, for embedding)
│
├── content/
│   └── experiments/
│       ├── _template/                    # copy this to scaffold a new experiment
│       │   ├── meta.ts
│       │   ├── component.tsx
│       │   └── .context/
│       │       ├── BRIEF.md
│       │       ├── STACK.md
│       │       └── LOG.md
│       └── threshold/
│           ├── meta.ts                   # typed metadata (slug, title, tags, series, type, status, date)
│           ├── threshold.html            # legacy HTML — iframe source
│           └── .context/
│               ├── BRIEF.md
│               ├── STACK.md
│               └── LOG.md
│
├── components/
│   ├── ui/                               # primitives: Badge, Card, Button
│   ├── gallery/
│   │   ├── ExperimentGrid.tsx
│   │   └── ExperimentCard.tsx
│   └── experiment/
│       ├── ExperimentLayout.tsx          # wrapper: back nav, title, tags, series
│       └── ExperimentFrame.tsx          # iframe wrapper for legacy HTML experiments
│
├── lib/
│   ├── types.ts                          # ExperimentMeta, ExperimentSeries, ExperimentType
│   └── experiments.ts                   # registry: discovers content/experiments/*/meta.ts at build time
│
├── scripts/
│   └── sync-experiments.ts              # copies content/experiments/[slug]/*.html → public/experiments/[slug]/
│
├── public/
│   └── experiments/
│       └── threshold/
│           └── threshold.html           # synced from content/ by build script, served for iframes
│
├── styles/
│   └── experiment-hud.css               # migrated from shared/hud.css
│
├── .context/                            # project-level context (keep as-is)
│   ├── INSTRUCTIONS.md                  # ← single source of cross-tool rules
│   ├── LOG.md                           # project-level activity log
│   └── SKILLS.md
│
├── docs/
│   └── superpowers/
│       └── specs/                       # design docs live here
│
├── CLAUDE.md                            # thin pointer → .context/INSTRUCTIONS.md
├── GEMINI.md                            # thin pointer → .context/INSTRUCTIONS.md
├── AGENTS.md                            # thin pointer → .context/INSTRUCTIONS.md
├── next.config.ts                       # basePath: '/musings'
├── tsconfig.json
├── package.json
└── vercel.json
```

---

## Architecture

### Experiment Types (hybrid render strategy)

Each experiment's `meta.ts` declares a `type` field:

```ts
// lib/types.ts
export type ExperimentType = "react" | "iframe";
export type ExperimentStatus = "live" | "wip" | "archived";

export interface ExperimentMeta {
  slug: string;
  title: string;
  description: string;
  date: string;               // ISO date
  type: ExperimentType;
  status: ExperimentStatus;
  tags: string[];
  series?: string;
  thumbnail?: string;         // optional OG/card image
  iframeSrc?: string;         // required when type === "iframe"
}
```

`[slug]/page.tsx` reads `meta.ts`, branches on `type`:
- `"react"` → imports and renders `component.tsx` directly
- `"iframe"` → renders `<ExperimentFrame src={meta.iframeSrc} />`

### Registry (`lib/experiments.ts`)

Reads all `content/experiments/*/meta.ts` at build time. Returns `ExperimentMeta[]`. Used by:
- Gallery page (`/experiments`) for static generation + filtering
- `[slug]/page.tsx` for `generateStaticParams`
- Any future RSS/sitemap generation

All pages are statically generated — no server runtime, deploys as pure static on Vercel.

### Build Step (`scripts/sync-experiments.ts`)

Runs as `prebuild` in `package.json`. Copies `content/experiments/[slug]/*.html` → `public/experiments/[slug]/` so legacy HTML files are served correctly by Next.js static file serving. Source stays co-located in `content/`; `public/` is the serving layer only.

---

## Context Hygiene (Multi-Model Architecture)

### Single Source of Truth Hierarchy

```
.context/INSTRUCTIONS.md                     ← cross-tool rules (one file, all tools read it)
.context/LOG.md                              ← project-level activity log
content/experiments/[slug]/meta.ts           ← machine-readable facts per experiment
content/experiments/[slug]/.context/
    BRIEF.md                                 ← what & why (written once, updated on concept pivot)
    STACK.md                                 ← tech decisions (updated when stack changes)
    LOG.md                                   ← experiment-level activity log
```

### AI Tool Entry Points (thin pointers only)

`CLAUDE.md`, `GEMINI.md`, `AGENTS.md` contain only:
> "Before doing anything, read `.context/INSTRUCTIONS.md` and the relevant experiment's `.context/` folder."

No facts, no duplicated content. One update to `.context/INSTRUCTIONS.md` propagates to all tools.

### Context Hygiene Rules (enforced in `.context/INSTRUCTIONS.md`)

1. After any task, append a line to the nearest `LOG.md` (project or experiment level)
2. `meta.ts` is the only place for structured facts (tags, status, series, type) — never in markdown
3. `BRIEF.md` is written once at experiment creation; only updated if the concept pivots
4. `STACK.md` is updated when a tech decision changes — not after every session
5. AI tool config files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) store routing instructions only — never facts

---

## Routing & Deployment

### Routes

| Path | Description |
|------|-------------|
| `/` | Redirects to `/experiments` |
| `/experiments` | Gallery grid, filterable by tag + series |
| `/experiments/[slug]` | Single experiment view |
| `/experiments/[slug]/embed` | Fullscreen, no nav — for embedding elsewhere |

### Vercel + Domain Config

- Standalone Vercel project
- `next.config.ts`: `basePath: '/musings'`
- Domain path assigned via Vercel dashboard to `thatguyabhishek.com/musings`
- No DNS changes required on the main site

### Static Generation

All routes use `generateStaticParams` + `getStaticProps` equivalents. No server runtime. Vercel deploys as static.

---

## Critical Files to Create/Modify

| File | Action |
|------|--------|
| `lib/types.ts` | Create — ExperimentMeta, ExperimentType, ExperimentSeries |
| `lib/experiments.ts` | Create — registry |
| `app/layout.tsx` | Create — root layout |
| `app/experiments/page.tsx` | Create — gallery grid |
| `app/experiments/[slug]/page.tsx` | Create — experiment view |
| `app/experiments/[slug]/embed/page.tsx` | Create — embed view |
| `components/gallery/ExperimentGrid.tsx` | Create |
| `components/gallery/ExperimentCard.tsx` | Create |
| `components/experiment/ExperimentLayout.tsx` | Create |
| `components/experiment/ExperimentFrame.tsx` | Create |
| `scripts/sync-experiments.ts` | Create — prebuild HTML sync |
| `content/experiments/threshold/meta.ts` | Create — migrate existing experiment |
| `content/experiments/_template/` | Create — scaffold template |
| `next.config.ts` | Create |
| `tsconfig.json` | Create |
| `package.json` | Create |
| `vercel.json` | Create |
| `CLAUDE.md` | Update — thin pointer only |
| `GEMINI.md` | Update — thin pointer only |
| `AGENTS.md` | Update — thin pointer only |
| `.context/INSTRUCTIONS.md` | Update — add context hygiene rules |

---

## Verification

1. `npm run dev` → `localhost:3000/musings/experiments` renders gallery grid with threshold card
2. Click threshold card → `localhost:3000/musings/experiments/threshold` renders iframe with existing HTML experiment
3. `/embed` route renders fullscreen, no nav
4. Filter by tag → gallery filters correctly
5. `npm run build` → completes without errors, `public/experiments/threshold/threshold.html` exists
6. Deploy to Vercel → `thatguyabhishek.com/musings/experiments` is live
7. Switch to Gemini CLI → reads `.context/INSTRUCTIONS.md`, appends to LOG.md correctly
8. Add a new experiment by copying `_template/` → appears in gallery after `npm run build`
