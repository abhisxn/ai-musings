# Gemini CLI — AI Musings

Read these files before doing anything:
- `.context/INSTRUCTIONS.md` — project rules and context hygiene
- `.context/LOG.md` — recent project activity
- If working on a specific experiment: `content/experiments/[slug]/.context/BRIEF.md`, `STACK.md`, `LOG.md`

Never store facts in this file. This is a routing file only.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
