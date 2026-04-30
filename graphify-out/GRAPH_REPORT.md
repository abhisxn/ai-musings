# Graph Report - AI Musings  (2026-05-01)

## Corpus Check
- 29 files · ~12,359 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 57 nodes · 36 edges · 3 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 5|Community 5]]

## God Nodes (most connected - your core abstractions)
1. `ExperimentsPage()` - 4 edges
2. `getAllExperiments()` - 4 edges
3. `getExperimentBySlug()` - 3 edges
4. `generateStaticParams()` - 2 edges
5. `ExperimentPage()` - 2 edges
6. `generateStaticParams()` - 2 edges
7. `ExperimentEmbedPage()` - 2 edges
8. `ensureDir()` - 2 edges
9. `syncExperiment()` - 2 edges
10. `getAllTags()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `generateStaticParams()` --calls--> `getAllExperiments()`  [INFERRED]
  app/experiments/[slug]/embed/page.tsx → lib/experiments.ts
- `ExperimentsPage()` --calls--> `getAllExperiments()`  [INFERRED]
  app/experiments/page.tsx → lib/experiments.ts
- `ExperimentsPage()` --calls--> `getAllTags()`  [INFERRED]
  app/experiments/page.tsx → lib/experiments.ts
- `ExperimentsPage()` --calls--> `getAllSeries()`  [INFERRED]
  app/experiments/page.tsx → lib/experiments.ts
- `generateStaticParams()` --calls--> `getAllExperiments()`  [INFERRED]
  app/experiments/[slug]/page.tsx → lib/experiments.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.38
Nodes (5): ExperimentsPage(), getAllExperiments(), getAllSeries(), getAllTags(), generateStaticParams()

### Community 1 - "Community 1"
Cohesion: 0.33
Nodes (4): ExperimentEmbedPage(), generateStaticParams(), getExperimentBySlug(), ExperimentPage()

### Community 5 - "Community 5"
Cohesion: 1.0
Nodes (2): ensureDir(), syncExperiment()

## Knowledge Gaps
- **Thin community `Community 5`** (3 nodes): `ensureDir()`, `syncExperiment()`, `sync-experiments.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getAllExperiments()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `getExperimentBySlug()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `ExperimentsPage()` (e.g. with `getAllExperiments()` and `getAllTags()`) actually correct?**
  _`ExperimentsPage()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `getAllExperiments()` (e.g. with `ExperimentsPage()` and `generateStaticParams()`) actually correct?**
  _`getAllExperiments()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `getExperimentBySlug()` (e.g. with `ExperimentPage()` and `ExperimentEmbedPage()`) actually correct?**
  _`getExperimentBySlug()` has 2 INFERRED edges - model-reasoned connections that need verification._