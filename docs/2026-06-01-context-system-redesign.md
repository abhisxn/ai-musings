# Context System Redesign — Repo as Living Brain

**Date:** 2026-06-01  
**Status:** approved

## Goal

Treat the repo structure as a tiered context system that serves both AI collaboration (full context on session start, no hallucinations from stale docs) and human navigation (clean, well-organised codebase as experiments scale).

---

## Tier System

| Tier | Location | Job | Update trigger |
|------|----------|-----|----------------|
| 0 — Routing | `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` | Point AI to the right context | Never (routing only) |
| 1 — Project brain | `.context/` | Rules, LOG, patterns | After any session |
| 2 — Decisions | `docs/adr/` | Why things are the way they are | When architecture changes |
| 3 — Experiment brain | `experiments/[slug]/.context/` | Per-experiment brief, stack, log | Per experiment session |
| 4 — AI memory | `~/.claude/projects/.../memory/` | Cross-session facts not in code | When something non-obvious is learned |
| 5 — Knowledge graph | `graphify-out/` | Structural map (generated, not edited) | On demand via `/graphify` |

One job per tier. Nothing lives in two tiers. If a file doesn't belong to a tier, it doesn't belong in the repo.

---

## Structural Changes

### Delete / clean up
- `docs/` empty dir — already cleaned; recreate as `docs/adr/`
- `experiments/threshold/TEST_PLAN_V4.md` — stale plan doc, not a tier artifact
- `.superpowers/brainstorm/` — session ephemera, add to `.gitignore`

### Gitignore additions
- `out/` — Next.js static export build artifact
- `graphify-out/` — generated on demand, not source of truth
- `.superpowers/` — session scratch space

### Skills consolidation
- `.claude/skills/` — project-scoped Claude patterns
- `.agents/skills/` — Copilot CLI patterns
- Never duplicate across both; precedence is per-tool not per-project

### Create
- `docs/adr/` — home for Architecture Decision Records
- `docs/adr/0001-repo-as-brain.md` — seeds the tier system decision
- `docs/adr/0002-static-export-vercel.md` — why `output: export`, what it rules out
- `docs/adr/0003-per-experiment-isolation.md` — why experiments own their stack

### Fix
- `.context/INSTRUCTIONS.md` — update folder map to match reality (`app/experiments/`, `components/`, `lib/`, `shared/`); update hygiene rules to include ADR, skills, memory, and ephemeral-file rules
- `.context/LOG.md` — clean malformed tab-prefixed entries

---

## Updated Context Hygiene Rules

Replaces the existing 6 rules in `INSTRUCTIONS.md`:

1. After any session, append a dated line to the nearest `LOG.md`
2. `meta.ts` is the only source of truth for structured experiment facts — never duplicate in markdown
3. `BRIEF.md` is written once at experiment creation; only update on concept pivot
4. `STACK.md` updates when a tech decision changes — not after every session
5. `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` are routing files only — never store facts in them
6. When switching AI tools mid-experiment, read `LOG.md` first
7. Architecture decisions go in `docs/adr/NNNN-title.md` when a non-obvious choice is made that future-you or an AI would otherwise re-litigate
8. Skills in `.claude/skills/` are project-scoped Claude patterns; skills in `.agents/skills/` are Copilot-scoped; never duplicate across both
9. `graphify-out/`, `out/`, `.superpowers/` are generated/ephemeral — never edit manually, never commit
10. AI memory (`~/.claude/projects/.../memory/`) captures cross-session facts not derivable from code; enrich it when something non-obvious is learned

---

## ADR Format

Lightweight — not RFC-heavy. Value is in *why*, not comprehensive documentation.

```markdown
# NNNN — Title

**Status:** accepted | superseded by NNNN | deprecated  
**Date:** YYYY-MM-DD

## Decision
One paragraph. What was decided.

## Why
What forced the decision. Constraints, tradeoffs, what was rejected.

## Consequences
What this makes easier. What it makes harder.
```

---

## Memory Enrichment

Seven new memory entries to write during implementation:

| Memory | Type |
|--------|------|
| Project is a creative lab — loose TypeScript, TODOs expected | user |
| Routing files only — CLAUDE.md/GEMINI.md/AGENTS.md never store facts | feedback |
| `app/experiments/[slug]/` is the actual route (INSTRUCTIONS.md was stale) | project |
| `lib/experiments.ts` is the experiment registry | project |
| Static export (`output: export`) — no server-side features, no API routes | project |
| Only one experiment so far: `threshold`; `_template` is the scaffold | project |
| Skills: `.claude/skills/` for Claude, `.agents/skills/` for Copilot | feedback |

---

## Out of Scope

- No changes to experiment code or app routing
- No changes to `.context/` structure (already correct)
- No refactoring of `shared/` or `components/` (separate concern)
- No new experiments
