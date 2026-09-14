# Charts Studio

## Design POV
Which chart to use is a scored decision with a paper trail, not a template picker. A recommendation without a stated reason and a baseline it beat is just a guess with better formatting.

## What It Is
A dataset-in, ranked-chart-gallery-out tool. Paste or import a table and get back the best chart types for that specific data's correlations, outliers, and trends - each one scored, explained, and gated against an Excel-style baseline.

## What It Does
- Infers per-column semantic type (numeric / categorical / date / id) from messy real-world headers and values
- Runs a deterministic findings pass (correlation matrix, IQR outliers, skew/kurtosis, seasonality) ranked by narrative significance
- Recommends chart types via the Excel taxonomy + FT Visual Vocabulary, tie-broken by Cleveland & McGill perceptual accuracy
- Scores every rendered candidate on 6 weighted dimensions and gates it against a baseline before it's allowed to rank
- Runs a refine loop that maps a failed gate to a specific fix and retries, instead of shipping a rejected candidate anyway
- Exports PNG or JSON with the full reasoning trace attached

## The Problem
Excel's Recommended Charts and Tableau's Show Me both exist, and neither shows its work. Every AI chart tool worth checking suggests a type from a prompt, not from the actual statistical shape of the data. Nothing found in this pass was gated against a baseline the user could see side by side.

## STAR

**Situation.** Excel's Recommended Charts and Tableau's Show Me both exist, and neither shows its work - you get a chart, not a reason. Every AI chart tool suggests a type from a text prompt, not from the actual statistical shape of the data in front of it.

**Task.** Build a pipeline that treats "which chart" as a scored decision with a paper trail, gate every candidate against a real premium bar, and ground the whole thing in an actual research pass before writing a line of pipeline code.

**Action.** Wrote six research documents first: chart theory, chart anatomy, the full Excel taxonomy, a validated color/contrast system, and canonical good/bad charts. Designed the pipeline as six stages (Data Profiler, Pattern & Insight Analyst, Chart-Type Recommender, Design & Styling Generator, QA & Critique, Gallery Curator), then built the current version as a deterministic scoring and refine engine mirroring those exact contracts.

**Result.** Paste a table, get a ranked, scored, gated gallery in seconds. The LLM reasoning layer the research calls for is designed but not yet wired in - it's a drop-in behind the same six-stage interface, not a rewrite.

## Links
- Source: https://github.com/abhisxn/charts-studio
- No live deployment yet

## Structure
This experiment doesn't run inline. It's a full standalone Next.js 15 app, not yet deployed. `index.tsx` here is a launcher card linking to the repo, not an embed of the app itself.
