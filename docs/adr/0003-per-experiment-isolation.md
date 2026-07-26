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
