# Context System Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the AI Musings repo into a tiered context system so that any AI session starts with full context, no stale docs, and clear rules for where everything lives.

**Architecture:** Six tiers (routing → project brain → decisions → experiment brain → AI memory → knowledge graph), each with one job and one update rule. Structural changes are minimal — this is mostly about fixing existing files, adding gitignore entries, seeding ADRs, and enriching memory.

**Tech Stack:** Markdown, .gitignore, git — no code changes, no npm.

**Spec:** `docs/2026-06-01-context-system-redesign.md`

---

## File Map

| Action | Path |
|--------|------|
| Modify | `.gitignore` |
| Delete | `experiments/threshold/TEST_PLAN_V4.md` |
| Modify | `.context/INSTRUCTIONS.md` |
| Modify | `.context/LOG.md` |
| Create | `docs/adr/0001-repo-as-brain.md` |
| Create | `docs/adr/0002-static-export-vercel.md` |
| Create | `docs/adr/0003-per-experiment-isolation.md` |
| Create | `~/.claude/projects/-Users-abhishek-AI-Musings/memory/feedback_routing_files.md` |
| Create | `~/.claude/projects/-Users-abhishek-AI-Musings/memory/project_app_routing.md` |
| Create | `~/.claude/projects/-Users-abhishek-AI-Musings/memory/project_static_export.md` |
| Create | `~/.claude/projects/-Users-abhishek-AI-Musings/memory/project_experiment_registry.md` |
| Create | `~/.claude/projects/-Users-abhishek-AI-Musings/memory/project_only_threshold.md` |
| Create | `~/.claude/projects/-Users-abhishek-AI-Musings/memory/feedback_skills_locations.md` |
| Create | `~/.claude/projects/-Users-abhishek-AI-Musings/memory/user_creative_lab.md` |
| Modify | `~/.claude/projects/-Users-abhishek-AI-Musings/memory/MEMORY.md` |

---

## Task 1: Gitignore + delete stale file

**Files:**
- Modify: `.gitignore`
- Delete: `experiments/threshold/TEST_PLAN_V4.md`

- [ ] **Step 1: Add missing gitignore entries**

Open `.gitignore`. It currently reads:
```
node_modules/
.next/
out/
.DS_Store
*.local
node_modules
.vscode/
tsconfig.tsbuildinfo
```

Replace with:
```
node_modules/
.next/
out/
.DS_Store
*.local
.vscode/
tsconfig.tsbuildinfo
graphify-out/
.superpowers/
```

(Removed duplicate `node_modules` line. Added `graphify-out/` and `.superpowers/`.)

- [ ] **Step 2: Verify gitignore takes effect**

Run:
```bash
git status
```

Expected: `graphify-out/` and `.superpowers/` no longer appear as untracked. `out/` was already gitignored.

- [ ] **Step 3: Delete stale test plan**

Run:
```bash
rm "experiments/threshold/TEST_PLAN_V4.md"
```

- [ ] **Step 4: Verify deletion**

Run:
```bash
git status
```

Expected: `experiments/threshold/TEST_PLAN_V4.md` shows as deleted.

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git add -u experiments/threshold/TEST_PLAN_V4.md
git commit -m "chore: gitignore ephemeral dirs, delete stale test plan"
```

---

## Task 2: Fix INSTRUCTIONS.md — folder map

**Files:**
- Modify: `.context/INSTRUCTIONS.md`

- [ ] **Step 1: Replace the folder map**

The current map in `.context/INSTRUCTIONS.md` (lines 4–22) reflects the original planned structure, not reality. Replace the entire `## Folder Structure` section with:

```markdown
## Folder Structure
ai-musings/
├── .context/              ← project brain (never delete, always update)
├── CLAUDE.md              ← Claude Code routing (never store facts here)
├── GEMINI.md              ← Gemini CLI routing (never store facts here)
├── AGENTS.md              ← Universal routing (never store facts here)
├── app/
│   ├── experiments/
│   │   ├── page.tsx           ← gallery page
│   │   └── [slug]/
│   │       └── page.tsx       ← experiment viewer route
│   ├── layout.tsx
│   ├── page.tsx               ← redirects to /experiments
│   └── globals.css
├── components/
│   ├── experiment/            ← ExperimentFrame, ExperimentLayout, ExperimentView
│   ├── gallery/               ← ExperimentCard, ExperimentGrid
│   └── ui/                    ← Badge, Card
├── experiments/
│   └── [slug]/
│       ├── meta.ts            ← experiment metadata (single source of truth)
│       ├── index.tsx          ← experiment React component
│       ├── src/               ← experiment-specific logic (if needed)
│       ├── threshold.html     ← single-file vanilla experiment (if applicable)
│       ├── README.md          ← design POV + build notes
│       └── .context/          ← BRIEF.md, STACK.md, LOG.md
├── lib/
│   ├── experiments.ts         ← experiment registry (getAllExperiments etc.)
│   └── types.ts               ← ExperimentMeta interface
├── shared/
│   ├── audio.js               ← shared audio utilities
│   ├── camera.js              ← shared camera utilities
│   └── hud.css                ← shared HUD styles
├── docs/
│   ├── adr/                   ← Architecture Decision Records
│   └── plans/                 ← implementation plans
├── scripts/
│   └── sync-experiments.ts    ← prebuild: syncs HTML files to public/
├── public/
│   └── experiments/           ← synced HTML experiment files (generated)
└── package.json
```

- [ ] **Step 2: Verify the file reads correctly**

Run:
```bash
head -60 ".context/INSTRUCTIONS.md"
```

Expected: folder map shows `app/experiments/[slug]/` not `app/musings/[slug]/`, and includes `components/`, `lib/`, `docs/adr/`.

- [ ] **Step 3: Commit**

```bash
git add .context/INSTRUCTIONS.md
git commit -m "docs: update INSTRUCTIONS folder map to match reality"
```

---

## Task 3: Fix INSTRUCTIONS.md — hygiene rules

**Files:**
- Modify: `.context/INSTRUCTIONS.md`

- [ ] **Step 1: Replace the Context Hygiene Rules section**

Find the `## Context Hygiene Rules (Multi-Model)` section and replace it entirely with:

```markdown
## Context Hygiene Rules (Multi-Model)

These rules apply regardless of which AI tool is being used (Claude, Gemini, Copilot, etc.):

1. After any session, append a dated line to the nearest `LOG.md` (project or experiment level).
   Format: `[YYYY-MM-DD] [SECTION] Done — [decision or note]`
2. `experiments/[slug]/meta.ts` is the only source of truth for structured facts (tags, status, series, type, date). Never duplicate these in markdown.
3. `BRIEF.md` is written once at experiment creation. Only update it if the concept pivots significantly.
4. `STACK.md` is updated when a tech decision changes — not after every session.
5. `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` are routing files only — never store facts in them.
6. When switching AI tools mid-experiment, read `LOG.md` first to understand current state.
7. Architecture decisions go in `docs/adr/NNNN-title.md` when a non-obvious choice is made that future-you or an AI would otherwise re-litigate. Use the lightweight ADR format.
8. Skills in `.claude/skills/` are project-scoped Claude patterns. Skills in `.agents/skills/` are Copilot CLI patterns. Never duplicate across both.
9. `graphify-out/`, `out/`, `.superpowers/` are generated or ephemeral — never edit manually, never commit.
10. AI memory (`~/.claude/projects/.../memory/`) captures cross-session facts not derivable from code. Enrich it when something non-obvious is learned.

## ADR Format

Save to `docs/adr/NNNN-title.md`. Keep it short — value is in *why*, not comprehensive coverage.

```markdown
# NNNN — Title

**Status:** accepted | superseded by NNNN | deprecated
**Date:** YYYY-MM-DD

## Decision
One paragraph. What was decided.

## Why
Constraints, tradeoffs, what was rejected.

## Consequences
What this makes easier. What it makes harder.
```
```

- [ ] **Step 2: Commit**

```bash
git add .context/INSTRUCTIONS.md
git commit -m "docs: update context hygiene rules, add ADR format"
```

---

## Task 4: Fix LOG.md — clean malformed entries

**Files:**
- Modify: `.context/LOG.md`

- [ ] **Step 1: Read and identify malformed lines**

Open `.context/LOG.md`. Lines starting with a number followed by a tab (e.g. `4\t2026-04-30 —`) are malformed — they have line-number prefixes from a `cat -n` paste. Clean them by removing the leading number+tab prefix and any leading whitespace.

The corrected LOG.md should read:

```
2026-04-30 — Scaffolded folder structure: added experiments/threshold/ with .context/{BRIEF,STACK,LOG}.md + threshold.html; added shared/camera.js, shared/audio.js, shared/hud.css.
2026-04-30 — Task 1 complete: bootstrapped Next.js (v16) + React (v19) + TypeScript + Tailwind CSS v3; created next.config.ts (basePath /musings, static export), tsconfig.json (loose), vercel.json, app/globals.css, tailwind.config.js, postcss.config.js; git init + initial commit.
2026-04-30 — Fixed invalid dependency versions in package.json (next ^16→^15.2.4, typescript ^6→^5.8.0, @types/node ^25→^22.0.0, removed "type":"commonjs"); fixed vercel.json framework "nextjs"→null; npm install verified OK (Next.js v15.5.15 installed).
2026-04-30 — Task 2 complete: created lib/types.ts (ExperimentMeta interface + types) and lib/experiments.ts (registry functions: getAllExperiments, getExperimentBySlug, getAllTags, getAllSeries); imported thresholdMeta; committed as "feat: add experiment types and registry".
2026-04-30 — Task 9 complete: created experiment template scaffold at content/experiments/_template/; added meta.ts (ExperimentMeta with boilerplate fields), component.tsx (React client component with canvas ref), .context/{BRIEF.md,STACK.md,LOG.md} (developer instructions); committed as "feat: add experiment template scaffold".
2026-04-30 — Task 4 complete: created scripts/sync-experiments.ts (prebuild script); syncs .html files from content/experiments/[slug]/ → public/experiments/[slug]/; verified script executes successfully (synced threshold/threshold.html); committed as "feat: add prebuild script to sync HTML experiments to public/".
2026-04-30 — Task 7 complete: created components/experiment/ExperimentFrame.tsx (iframe wrapper for embedding experiments with camera/microphone/autoplay permissions) and components/experiment/ExperimentLayout.tsx (server component layout with header, metadata display, tag badges, and embed mode); committed as "feat: add ExperimentLayout and ExperimentFrame components".
2026-04-30 — Task 8 complete: created app/layout.tsx (root layout with Share Tech Mono font), app/page.tsx (meta-refresh redirect to /musings/experiments), app/experiments/page.tsx (gallery page), app/experiments/[slug]/page.tsx (experiment viewer), app/experiments/[slug]/embed/page.tsx (embed route); dev server verified HTTP 200; committed as "feat: add gallery page, experiment viewer, and embed route".
2026-04-30 — Task 4 complete: Implemented Camera State Animation for 'threshold' experiment; added AnimatedCamera component to index.tsx for smooth transitions between flat and volumetric views.
2026-05-01 — Task complete: Comprehensive "Otherworldly Terminal HUD" redesign. Implemented unified design system (Neon Void/Cryptic Artifact), global CRT HUD overlays (scanlines, vignette, noise), and restyled all UI components with glitch/ASCII aesthetics.
2026-05-01 — Task complete: Overhauled 'Threshold' experiment with Radiohead "House of Cards" inspired spectral rendering. Fixed Radio/Blocks rendering bugs, implemented multi-chromatic Heatmap, and added user-controlled Gridlines toggle.
2026-05-01 — Task complete: Fixed audio engine in 'Threshold' experiment. Resolved sound type switching bug and implemented vertical pitch-mapping using a C Major Pentatonic scale for responsive, melodic feedback.
2026-05-01 — Task complete: App-wide refactoring and Threshold isolation. Consolidated 'content/' into 'experiments/', renamed routing to '/musings/experiments/', and encapsulated Threshold logic in 'src/'.
[2026-04-30] [FULL BUILD] Done — Next.js 15 static export builds cleanly, all routes verified
[2026-06-01] [CONTEXT SYSTEM] Done — Repo-as-brain tier system implemented; ADRs seeded; memory enriched; INSTRUCTIONS.md updated to match reality
```

- [ ] **Step 2: Commit**

```bash
git add .context/LOG.md
git commit -m "docs: clean malformed LOG.md entries, add session log"
```

---

## Task 5: Seed Architecture Decision Records

**Files:**
- Create: `docs/adr/0001-repo-as-brain.md`
- Create: `docs/adr/0002-static-export-vercel.md`
- Create: `docs/adr/0003-per-experiment-isolation.md`

- [ ] **Step 1: Create docs/adr/ directory**

```bash
mkdir -p docs/adr
```

- [ ] **Step 2: Write ADR 0001**

Create `docs/adr/0001-repo-as-brain.md`:

```markdown
# 0001 — Repo as Living Brain

**Status:** accepted
**Date:** 2026-06-01

## Decision
The repo structure is a tiered context system with six explicit tiers: routing files (CLAUDE.md etc.), project brain (.context/), decisions (docs/adr/), experiment brain (experiments/[slug]/.context/), AI memory (~/.claude/.../memory/), and knowledge graph (graphify-out/). Each tier has one job and one update rule. Nothing lives in two tiers.

## Why
The project uses multiple AI tools (Claude, Gemini, Copilot) across many sessions. Without explicit tiers, context accumulates in ad-hoc locations (plans buried in docs/superpowers/, stale INSTRUCTIONS.md, empty memory), causing each new session to re-derive context from scratch or hallucinate from stale docs. The tier system makes the right place for every file unambiguous.

## Consequences
Easier: new AI sessions start with full context; stale docs are identifiable (they don't belong to any tier); adding experiments follows a clear pattern.
Harder: requires discipline to update the right tier after each session; memory files live outside the repo and must be enriched manually.
```

- [ ] **Step 3: Write ADR 0002**

Create `docs/adr/0002-static-export-vercel.md`:

```markdown
# 0002 — Static Export + Vercel Deployment

**Status:** accepted
**Date:** 2026-06-01

## Decision
The Next.js app uses `output: 'export'` in `next.config.ts`, producing a static site deployed to Vercel. Push to main triggers auto-deploy. No manual deploy steps.

## Why
This is a creative portfolio, not a SaaS product. Static export eliminates server costs, cold starts, and operational complexity. Vercel's free tier handles the traffic. The tradeoff (no server-side features) is acceptable because no experiment requires dynamic server logic.

## Consequences
Easier: zero-config deploy, no server maintenance, fast global CDN delivery.
Harder: no API routes, no server components with data fetching, no dynamic OG images. Any feature requiring a server must use a third-party service or be rethought.
```

- [ ] **Step 4: Write ADR 0003**

Create `docs/adr/0003-per-experiment-isolation.md`:

```markdown
# 0003 — Per-Experiment Isolation

**Status:** accepted
**Date:** 2026-06-01

## Decision
Each experiment owns its full stack inside `experiments/[slug]/`. Experiments may use different rendering approaches (React + Three.js, vanilla HTML+JS, p5.js), different audio libraries, and different camera handling. Shared utilities exist in `shared/` but experiments are not required to use them.

## Why
Creative code resists premature abstraction. Experiments are explorations — the right abstraction only emerges after building several things. Isolating each experiment means a new experiment can't break an existing one, and experiments can be deleted without side effects. The cost (some duplication) is lower than the cost of a premature shared abstraction that constrains creative decisions.

## Consequences
Easier: add new experiments freely; change one without touching others; delete experiments cleanly.
Harder: shared utilities can diverge; can't refactor all experiments at once; bundle size isn't optimised across experiments.
```

- [ ] **Step 5: Commit**

```bash
git add docs/adr/
git commit -m "docs: seed three foundation ADRs (repo-as-brain, static-export, per-experiment-isolation)"
```

---

## Task 6: Memory enrichment

**Files:**
- Create: 7 files in `~/.claude/projects/-Users-abhishek-AI-Musings/memory/`
- Modify: `~/.claude/projects/-Users-abhishek-AI-Musings/memory/MEMORY.md`

Memory files live outside the repo (no git commit needed).

- [ ] **Step 1: Write user memory — creative lab mindset**

Create `~/.claude/projects/-Users-abhishek-AI-Musings/memory/user_creative_lab.md`:

```markdown
---
name: user-creative-lab
description: User runs this project as a creative lab, not a production app — loose standards are intentional
metadata:
  type: user
---

This is a creative coding portfolio and lab, not a production application. TypeScript strict mode is deliberately off. TODOs in experiment code are expected and fine. Over-abstraction is worse than duplication. Code style is loose by design — experiments are explorations, not shipped products.

**How to apply:** Don't suggest strict TypeScript, production-grade error handling, or premature abstractions in experiment code. Do apply rigor to the framework/routing layer (app/, lib/, components/).
```

- [ ] **Step 2: Write feedback memory — routing files rule**

Create `~/.claude/projects/-Users-abhishek-AI-Musings/memory/feedback_routing_files.md`:

```markdown
---
name: feedback-routing-files
description: CLAUDE.md, GEMINI.md, AGENTS.md are routing files only — never store facts in them
metadata:
  type: feedback
---

Never store facts, decisions, or context in CLAUDE.md, GEMINI.md, or AGENTS.md. These are routing files that point AI tools to the right context files. All facts go in .context/INSTRUCTIONS.md, experiment .context/ dirs, docs/adr/, or memory.

**Why:** Routing files are read by all AI tools and should stay stable. Facts stored here become stale and mislead tools that can't cross-reference them.

**How to apply:** If asked to update CLAUDE.md with a fact or decision, redirect to the appropriate tier instead.
```

- [ ] **Step 3: Write project memory — actual app routing**

Create `~/.claude/projects/-Users-abhishek-AI-Musings/memory/project_app_routing.md`:

```markdown
---
name: project-app-routing
description: Actual Next.js route is app/experiments/[slug]/ — INSTRUCTIONS.md previously said app/musings/[slug]/ (now corrected)
metadata:
  type: project
---

The live route for experiments is `/experiments/[slug]/` served from `app/experiments/[slug]/page.tsx`. An earlier version of INSTRUCTIONS.md documented this as `app/musings/[slug]/` which was the original planned structure but never matched reality. INSTRUCTIONS.md was corrected on 2026-06-01.

**Why:** The routing was renamed early in development (2026-05-01) but INSTRUCTIONS.md was never updated, creating a trap for AI sessions that read it.

**How to apply:** When adding new experiments or referencing routing, use `app/experiments/[slug]/` not `app/musings/[slug]/`.
```

- [ ] **Step 4: Write project memory — static export constraint**

Create `~/.claude/projects/-Users-abhishek-AI-Musings/memory/project_static_export.md`:

```markdown
---
name: project-static-export
description: Next.js app uses output:export — no server-side features, no API routes
metadata:
  type: project
---

next.config.ts sets `output: 'export'`. The app is a fully static site. There are no API routes, no server components with data fetching, no server actions, no dynamic routes that require a server.

**Why:** Creative portfolio — static is simpler, cheaper, faster. See docs/adr/0002-static-export-vercel.md.

**How to apply:** Any feature requiring a server must use a third-party service or be redesigned. Don't suggest API routes, server actions, or server-only Next.js features.
```

- [ ] **Step 5: Write project memory — experiment registry**

Create `~/.claude/projects/-Users-abhishek-AI-Musings/memory/project_experiment_registry.md`:

```markdown
---
name: project-experiment-registry
description: lib/experiments.ts is the experiment registry — getAllExperiments, getExperimentBySlug etc.
metadata:
  type: project
---

`lib/experiments.ts` is the source of truth for the experiment list. It exports `getAllExperiments()`, `getExperimentBySlug()`, `getAllTags()`, `getAllSeries()`. Each experiment's `meta.ts` is the source of truth for structured facts (tags, status, date, series, type) — never duplicate these in markdown.

**How to apply:** When adding a new experiment, add its meta.ts import to lib/experiments.ts. When querying experiment metadata, use these registry functions not direct file reads.
```

- [ ] **Step 6: Write project memory — only threshold exists**

Create `~/.claude/projects/-Users-abhishek-AI-Musings/memory/project_only_threshold.md`:

```markdown
---
name: project-only-threshold
description: Only one experiment exists so far — threshold; _template is the scaffold, not a real experiment
metadata:
  type: project
---

As of 2026-06-01, `experiments/threshold/` is the only real experiment. `experiments/_template/` is a scaffold for creating new experiments — it is not a real experiment and should not appear in the gallery.

**How to apply:** Don't reference other experiments as if they exist. When helping add a new experiment, copy from `_template/`.
```

- [ ] **Step 7: Write feedback memory — skills locations**

Create `~/.claude/projects/-Users-abhishek-AI-Musings/memory/feedback_skills_locations.md`:

```markdown
---
name: feedback-skills-locations
description: Skills live in two places with distinct purposes — .claude/skills/ for Claude, .agents/skills/ for Copilot; never duplicate
metadata:
  type: feedback
---

Project-scoped skills live in exactly one place per tool: `.claude/skills/` for Claude Code, `.agents/skills/` for Copilot CLI. Before this was clarified (2026-06-01), skills existed in three locations (.agents/skills/, .claude/skills/, ~/.claude/skills/) with no clear precedence.

**Why:** Duplicate skills across locations cause confusion about which version is active and which to update.

**How to apply:** When adding a project-specific skill, choose one location based on which tool it targets. Global skills go in ~/.claude/skills/ (outside the repo).
```

- [ ] **Step 8: Update MEMORY.md index**

Open `~/.claude/projects/-Users-abhishek-AI-Musings/memory/MEMORY.md` and replace its contents with:

```markdown
# Memory Index

- [AI Musings Project Structure](project_ai_musings_structure.md) — Next.js 15 content-layer architecture, registry pattern, iframeSrc path convention, adding new experiments
- [Creative Lab Mindset](user_creative_lab.md) — Project is a creative lab; loose TypeScript and TODOs are intentional; don't over-engineer experiment code
- [Routing Files Rule](feedback_routing_files.md) — CLAUDE.md/GEMINI.md/AGENTS.md are routing only; never store facts in them
- [Actual App Routing](project_app_routing.md) — Route is app/experiments/[slug]/ not app/musings/[slug]/ (INSTRUCTIONS.md was stale until 2026-06-01)
- [Static Export Constraint](project_static_export.md) — output:export means no server features, no API routes
- [Experiment Registry](project_experiment_registry.md) — lib/experiments.ts is the registry; meta.ts is source of truth per experiment
- [Only Threshold Exists](project_only_threshold.md) — One real experiment (threshold); _template is scaffold only
- [Skills Locations](feedback_skills_locations.md) — .claude/skills/ for Claude, .agents/skills/ for Copilot; never duplicate
```

- [ ] **Step 9: Verify memory index**

Run:
```bash
cat ~/.claude/projects/-Users-abhishek-AI-Musings/memory/MEMORY.md
```

Expected: 8 entries, all with valid file links.
