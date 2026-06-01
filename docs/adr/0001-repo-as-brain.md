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
