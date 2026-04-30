# Next.js Project Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a production-ready Next.js + Vercel project structure for AI Musings with a gallery grid, tag/series filtering, hybrid iframe+React experiment rendering, and multi-model context hygiene.

**Architecture:** Content-layer pattern — each experiment lives in `content/experiments/[slug]/` with a typed `meta.ts`, optional `component.tsx` (React), or `.html` (legacy iframe). A registry in `lib/experiments.ts` auto-discovers all experiments at build time and drives all routing and gallery pages statically.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Vercel (static export), Node.js build scripts

---

## File Map

| File | Responsibility |
|------|---------------|
| `lib/types.ts` | Shared TypeScript types for experiments |
| `lib/experiments.ts` | Registry — discovers and exports all experiment metadata |
| `app/layout.tsx` | Root layout with font, metadata, minimal nav |
| `app/globals.css` | Global styles + Tailwind base |
| `app/page.tsx` | Root redirect to `/experiments` |
| `app/experiments/page.tsx` | Gallery grid with tag + series filter |
| `app/experiments/[slug]/page.tsx` | Single experiment view — branches on type |
| `app/experiments/[slug]/embed/page.tsx` | Fullscreen embed view, no nav |
| `components/ui/Badge.tsx` | Tag badge primitive |
| `components/ui/Card.tsx` | Card primitive |
| `components/gallery/ExperimentGrid.tsx` | Grid layout with filter state |
| `components/gallery/ExperimentCard.tsx` | Single card in gallery |
| `components/experiment/ExperimentLayout.tsx` | Back nav, title, tags wrapper |
| `components/experiment/ExperimentFrame.tsx` | iframe wrapper for legacy HTML |
| `scripts/sync-experiments.ts` | Prebuild — copies HTML from content/ to public/ |
| `content/experiments/_template/meta.ts` | Template metadata for new experiments |
| `content/experiments/_template/component.tsx` | Template React component |
| `content/experiments/_template/.context/BRIEF.md` | Template BRIEF |
| `content/experiments/_template/.context/STACK.md` | Template STACK |
| `content/experiments/_template/.context/LOG.md` | Template LOG |
| `content/experiments/threshold/meta.ts` | Metadata for existing threshold experiment |
| `next.config.ts` | Next.js config with basePath `/musings` |
| `tsconfig.json` | TypeScript config |
| `package.json` | Dependencies + prebuild script |
| `vercel.json` | Vercel deployment config |
| `CLAUDE.md` | Thin pointer to `.context/INSTRUCTIONS.md` |
| `GEMINI.md` | Thin pointer to `.context/INSTRUCTIONS.md` |
| `AGENTS.md` | Thin pointer to `.context/INSTRUCTIONS.md` |
| `.context/INSTRUCTIONS.md` | Updated with context hygiene rules |

---

## Task 1: Bootstrap Next.js with TypeScript and Tailwind

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vercel.json`
- Create: `app/globals.css`

- [ ] **Step 1: Install dependencies**

Run from `/Users/abhishek/AI Musings`:
```bash
npm init -y
npm install next@latest react@latest react-dom@latest
npm install -D typescript @types/react @types/react-dom @types/node tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Create `package.json` scripts**

Replace the `scripts` section in `package.json`:
```json
{
  "scripts": {
    "dev": "next dev",
    "prebuild": "npx tsx scripts/sync-experiments.ts",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```
Also add `"tsx": "^4.0.0"` to `devDependencies` and run `npm install`.

- [ ] **Step 3: Create `next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/musings',
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create `vercel.json`**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "out",
  "framework": "nextjs"
}
```

- [ ] **Step 6: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-mono: 'Share Tech Mono', monospace;
}

body {
  background: #0a0a0a;
  color: #e5e5e5;
  font-family: var(--font-mono);
}
```

- [ ] **Step 7: Update `tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Share Tech Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 8: Commit**

```bash
git init
git add package.json next.config.ts tsconfig.json vercel.json tailwind.config.js postcss.config.js app/globals.css
git commit -m "chore: bootstrap Next.js with TypeScript and Tailwind"
```

---

## Task 2: Define Types and Registry

**Files:**
- Create: `lib/types.ts`
- Create: `lib/experiments.ts`

- [ ] **Step 1: Create `lib/types.ts`**

```typescript
export type ExperimentType = 'react' | 'iframe'
export type ExperimentStatus = 'live' | 'wip' | 'archived'

export interface ExperimentMeta {
  slug: string
  title: string
  description: string
  date: string           // ISO date e.g. "2026-04-30"
  type: ExperimentType
  status: ExperimentStatus
  tags: string[]
  series?: string
  thumbnail?: string     // path relative to /public e.g. "/experiments/threshold/thumb.jpg"
  iframeSrc?: string     // required when type === 'iframe', e.g. "/musings/experiments/threshold/threshold.html"
}
```

- [ ] **Step 2: Create `lib/experiments.ts`**

```typescript
import { ExperimentMeta } from './types'

// Import all meta files explicitly — Next.js static export requires static imports
import thresholdMeta from '@/content/experiments/threshold/meta'

const registry: ExperimentMeta[] = [
  thresholdMeta,
]

export function getAllExperiments(): ExperimentMeta[] {
  return registry.filter(e => e.status !== 'archived')
}

export function getExperimentBySlug(slug: string): ExperimentMeta | undefined {
  return registry.find(e => e.slug === slug)
}

export function getAllTags(): string[] {
  const tags = registry.flatMap(e => e.tags)
  return [...new Set(tags)].sort()
}

export function getAllSeries(): string[] {
  const series = registry.map(e => e.series).filter(Boolean) as string[]
  return [...new Set(series)].sort()
}
```

> **Note:** When you add a new experiment, add its import and entry to the registry array here. This is intentional — static export requires explicit imports, not dynamic `fs.readdir`.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts lib/experiments.ts
git commit -m "feat: add experiment types and registry"
```

---

## Task 3: Threshold Experiment Metadata

**Files:**
- Create: `content/experiments/threshold/meta.ts`
- Move: `experiments/threshold/threshold.html` → `content/experiments/threshold/threshold.html`
- Move: `experiments/threshold/.context/` → `content/experiments/threshold/.context/`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p content/experiments/threshold/.context
```

- [ ] **Step 2: Move existing files**

```bash
cp experiments/threshold/threshold.html content/experiments/threshold/threshold.html
cp experiments/threshold/.context/BRIEF.md content/experiments/threshold/.context/BRIEF.md
cp experiments/threshold/.context/STACK.md content/experiments/threshold/.context/STACK.md
cp experiments/threshold/.context/LOG.md content/experiments/threshold/.context/LOG.md
```

- [ ] **Step 3: Create `content/experiments/threshold/meta.ts`**

```typescript
import { ExperimentMeta } from '@/lib/types'

const meta: ExperimentMeta = {
  slug: 'threshold',
  title: 'Threshold v2',
  description: 'A camera-fed terminal instrument. Tune how it sees you.',
  date: '2026-04-30',
  type: 'iframe',
  status: 'wip',
  tags: ['vision', 'audio', 'terminal', 'camera'],
  series: 'perception',
  iframeSrc: '/experiments/threshold/threshold.html',
}

export default meta
```

- [ ] **Step 4: Verify registry picks it up**

Run:
```bash
npx tsx -e "import { getAllExperiments } from './lib/experiments'; console.log(getAllExperiments())"
```
Expected output: array with one object, slug `threshold`.

- [ ] **Step 5: Commit**

```bash
git add content/experiments/threshold/
git commit -m "feat: migrate threshold experiment to content layer"
```

---

## Task 4: Build Script — Sync HTML to Public

**Files:**
- Create: `scripts/sync-experiments.ts`

- [ ] **Step 1: Create `scripts/sync-experiments.ts`**

```typescript
import fs from 'fs'
import path from 'path'

const contentDir = path.join(process.cwd(), 'content', 'experiments')
const publicDir = path.join(process.cwd(), 'public', 'experiments')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function syncExperiment(slug: string) {
  const src = path.join(contentDir, slug)
  const dest = path.join(publicDir, slug)
  ensureDir(dest)

  const files = fs.readdirSync(src)
  for (const file of files) {
    if (file.endsWith('.html')) {
      fs.copyFileSync(path.join(src, file), path.join(dest, file))
      console.log(`Synced: ${slug}/${file}`)
    }
  }
}

const slugs = fs.readdirSync(contentDir).filter(f => !f.startsWith('_'))
for (const slug of slugs) {
  syncExperiment(slug)
}

console.log('Sync complete.')
```

- [ ] **Step 2: Run the script manually to verify**

```bash
npx tsx scripts/sync-experiments.ts
```
Expected output:
```
Synced: threshold/threshold.html
Sync complete.
```

Verify file exists:
```bash
ls public/experiments/threshold/
```
Expected: `threshold.html`

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-experiments.ts public/experiments/
git commit -m "feat: add prebuild script to sync HTML experiments to public/"
```

---

## Task 5: UI Primitives

**Files:**
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Card.tsx`

- [ ] **Step 1: Create `components/ui/Badge.tsx`**

```typescript
interface BadgeProps {
  label: string
  onClick?: () => void
  active?: boolean
}

export function Badge({ label, onClick, active = false }: BadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-2 py-0.5 text-xs font-mono border transition-colors
        ${active
          ? 'border-green-400 text-green-400 bg-green-400/10'
          : 'border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200'
        }
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 2: Create `components/ui/Card.tsx`**

```typescript
interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        border border-zinc-800 bg-zinc-950 p-4 transition-colors
        ${onClick ? 'cursor-pointer hover:border-zinc-600' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/
git commit -m "feat: add Badge and Card UI primitives"
```

---

## Task 6: Gallery Components

**Files:**
- Create: `components/gallery/ExperimentCard.tsx`
- Create: `components/gallery/ExperimentGrid.tsx`

- [ ] **Step 1: Create `components/gallery/ExperimentCard.tsx`**

```typescript
import Link from 'next/link'
import { ExperimentMeta } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface ExperimentCardProps {
  experiment: ExperimentMeta
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  return (
    <Link href={`/experiments/${experiment.slug}`}>
      <Card className="h-full flex flex-col gap-3 group">
        {experiment.thumbnail && (
          <div className="aspect-video bg-zinc-900 overflow-hidden">
            <img
              src={experiment.thumbnail}
              alt={experiment.title}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
        )}
        {!experiment.thumbnail && (
          <div className="aspect-video bg-zinc-900 flex items-center justify-center text-zinc-700 text-xs">
            [ no preview ]
          </div>
        )}
        <div className="flex flex-col gap-2 flex-1">
          <h2 className="text-sm font-mono text-zinc-100 group-hover:text-green-400 transition-colors">
            {experiment.title}
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed flex-1">
            {experiment.description}
          </p>
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            {experiment.series && (
              <Badge label={`series: ${experiment.series}`} />
            )}
            {experiment.tags.map(tag => (
              <Badge key={tag} label={tag} />
            ))}
          </div>
        </div>
        <div className="text-xs text-zinc-700 font-mono">
          {experiment.date} · {experiment.status}
        </div>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 2: Create `components/gallery/ExperimentGrid.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { ExperimentMeta } from '@/lib/types'
import { ExperimentCard } from './ExperimentCard'
import { Badge } from '@/components/ui/Badge'

interface ExperimentGridProps {
  experiments: ExperimentMeta[]
  tags: string[]
  series: string[]
}

export function ExperimentGrid({ experiments, tags, series }: ExperimentGridProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [activeSeries, setActiveSeries] = useState<string | null>(null)

  const filtered = experiments.filter(e => {
    const tagMatch = !activeTag || e.tags.includes(activeTag)
    const seriesMatch = !activeSeries || e.series === activeSeries
    return tagMatch && seriesMatch
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        {series.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-zinc-600 font-mono w-14">series</span>
            {series.map(s => (
              <Badge
                key={s}
                label={s}
                active={activeSeries === s}
                onClick={() => setActiveSeries(activeSeries === s ? null : s)}
              />
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-600 font-mono w-14">tags</span>
          {tags.map(t => (
            <Badge
              key={t}
              label={t}
              active={activeTag === t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-zinc-600 text-sm font-mono">no experiments match this filter.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(e => (
          <ExperimentCard key={e.slug} experiment={e} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/gallery/
git commit -m "feat: add ExperimentCard and ExperimentGrid gallery components"
```

---

## Task 7: Experiment Viewer Components

**Files:**
- Create: `components/experiment/ExperimentLayout.tsx`
- Create: `components/experiment/ExperimentFrame.tsx`

- [ ] **Step 1: Create `components/experiment/ExperimentFrame.tsx`**

```typescript
interface ExperimentFrameProps {
  src: string
  title: string
}

export function ExperimentFrame({ src, title }: ExperimentFrameProps) {
  return (
    <iframe
      src={src}
      title={title}
      className="w-full h-full border-0"
      allow="camera; microphone; autoplay"
      allowFullScreen
    />
  )
}
```

- [ ] **Step 2: Create `components/experiment/ExperimentLayout.tsx`**

```typescript
import Link from 'next/link'
import { ExperimentMeta } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'

interface ExperimentLayoutProps {
  meta: ExperimentMeta
  children: React.ReactNode
  embed?: boolean
}

export function ExperimentLayout({ meta, children, embed = false }: ExperimentLayoutProps) {
  if (embed) {
    return <div className="w-screen h-screen overflow-hidden">{children}</div>
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/experiments" className="text-xs text-zinc-600 hover:text-zinc-300 font-mono transition-colors">
            ← musings
          </Link>
          <h1 className="text-sm font-mono text-zinc-200">{meta.title}</h1>
        </div>
        <div className="flex gap-1">
          {meta.tags.map(tag => (
            <Badge key={tag} label={tag} />
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/experiment/
git commit -m "feat: add ExperimentLayout and ExperimentFrame components"
```

---

## Task 8: App Pages

**Files:**
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/experiments/page.tsx`
- Create: `app/experiments/[slug]/page.tsx`
- Create: `app/experiments/[slug]/embed/page.tsx`

- [ ] **Step 1: Create `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Musings',
  description: 'Interactive AI + creative experiments by Abhishek Saxena',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Create `app/page.tsx`**

Static export doesn't support server-side `redirect()`. Use a meta refresh instead:

```typescript
export default function Home() {
  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content="0;url=/musings/experiments" />
      </head>
      <body />
    </html>
  )
}
```

- [ ] **Step 3: Create `app/experiments/page.tsx`**

```typescript
import { getAllExperiments, getAllTags, getAllSeries } from '@/lib/experiments'
import { ExperimentGrid } from '@/components/gallery/ExperimentGrid'

export default function ExperimentsPage() {
  const experiments = getAllExperiments()
  const tags = getAllTags()
  const series = getAllSeries()

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-lg font-mono text-zinc-200 mb-1">AI Musings</h1>
        <p className="text-xs text-zinc-600 font-mono">
          {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
        </p>
      </header>
      <ExperimentGrid experiments={experiments} tags={tags} series={series} />
    </div>
  )
}
```

- [ ] **Step 4: Create `app/experiments/[slug]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getAllExperiments, getExperimentBySlug } from '@/lib/experiments'
import { ExperimentLayout } from '@/components/experiment/ExperimentLayout'
import { ExperimentFrame } from '@/components/experiment/ExperimentFrame'

export async function generateStaticParams() {
  return getAllExperiments().map(e => ({ slug: e.slug }))
}

interface Props {
  params: { slug: string }
}

export default function ExperimentPage({ params }: Props) {
  const meta = getExperimentBySlug(params.slug)
  if (!meta) notFound()

  return (
    <ExperimentLayout meta={meta}>
      {meta.type === 'iframe' && meta.iframeSrc ? (
        <ExperimentFrame src={meta.iframeSrc} title={meta.title} />
      ) : (
        <div className="flex items-center justify-center h-full text-zinc-600 text-sm font-mono">
          [ react component not yet connected ]
        </div>
      )}
    </ExperimentLayout>
  )
}
```

- [ ] **Step 5: Create `app/experiments/[slug]/embed/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getAllExperiments, getExperimentBySlug } from '@/lib/experiments'
import { ExperimentLayout } from '@/components/experiment/ExperimentLayout'
import { ExperimentFrame } from '@/components/experiment/ExperimentFrame'

export async function generateStaticParams() {
  return getAllExperiments().map(e => ({ slug: e.slug }))
}

interface Props {
  params: { slug: string }
}

export default function ExperimentEmbedPage({ params }: Props) {
  const meta = getExperimentBySlug(params.slug)
  if (!meta) notFound()

  return (
    <ExperimentLayout meta={meta} embed>
      {meta.type === 'iframe' && meta.iframeSrc ? (
        <ExperimentFrame src={meta.iframeSrc} title={meta.title} />
      ) : (
        <div className="flex items-center justify-center h-full text-zinc-600 text-sm font-mono">
          [ react component not yet connected ]
        </div>
      )}
    </ExperimentLayout>
  )
}
```

- [ ] **Step 6: Run dev server and verify**

```bash
npm run dev
```

Open `http://localhost:3000/musings/experiments` — should show gallery with threshold card.
Open `http://localhost:3000/musings/experiments/threshold` — should show iframe with threshold.html.
Open `http://localhost:3000/musings/experiments/threshold/embed` — should show fullscreen iframe, no nav.

- [ ] **Step 7: Commit**

```bash
git add app/
git commit -m "feat: add gallery page, experiment viewer, and embed route"
```

---

## Task 9: Experiment Template

**Files:**
- Create: `content/experiments/_template/meta.ts`
- Create: `content/experiments/_template/component.tsx`
- Create: `content/experiments/_template/.context/BRIEF.md`
- Create: `content/experiments/_template/.context/STACK.md`
- Create: `content/experiments/_template/.context/LOG.md`

- [ ] **Step 1: Create `content/experiments/_template/meta.ts`**

```typescript
import { ExperimentMeta } from '@/lib/types'

const meta: ExperimentMeta = {
  slug: 'your-slug-here',       // kebab-case
  title: 'Experiment Title',
  description: 'One sentence description.',
  date: '2026-01-01',           // ISO date
  type: 'react',                // 'react' | 'iframe'
  status: 'wip',                // 'live' | 'wip' | 'archived'
  tags: ['tag-one', 'tag-two'],
  series: undefined,            // optional series name
  // iframeSrc: '/musings/experiments/your-slug/index.html', // required if type === 'iframe'
}

export default meta
```

- [ ] **Step 2: Create `content/experiments/_template/component.tsx`**

```typescript
'use client'

import { useEffect, useRef } from 'react'

export default function ExperimentComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Mount your vanilla JS / p5 / Three.js logic here
    // Cleanup: return () => { /* teardown */ }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
    />
  )
}
```

- [ ] **Step 3: Create `.context/BRIEF.md`**

```markdown
# [Experiment Name]

## WHO YOU ARE BUILDING FOR

Abhishek Saxena. Senior product designer, 12+ years. Vibe coder.
Building AI Musings: creative web experiments at thatguyabhishek.com/musings.

## WHAT THIS EXPERIMENT IS

[One paragraph: what is the concept, what does the user do, what does it feel like]

## AESTHETIC

[Visual language, fonts, color palette, interaction feel]

## HARD RULES — NEVER VIOLATE

1. No backend. No auth. No database.
2. After each section is built, test it before proceeding.
3. Check STACK.md before choosing implementation format.

## AGENT BEHAVIOUR

- Read BRIEF.md, STACK.md, and LOG.md before writing any code.
- Build section by section. Log each completed section to LOG.md.
- Ask zero clarifying questions. The spec is complete. Build it.
```

- [ ] **Step 4: Create `.context/STACK.md`**

```markdown
# Stack

## Delivery Format

[react-component | single-file-html]

## Libraries

[List CDN or npm libraries used]

## Why

[One sentence per choice explaining why this stack for this experiment]
```

- [ ] **Step 5: Create `.context/LOG.md`**

```markdown
# Log

<!-- Append entries here after each work session -->
<!-- Format: [DATE] [SECTION] Done — [decision or note] -->
```

- [ ] **Step 6: Commit**

```bash
git add content/experiments/_template/
git commit -m "feat: add experiment template scaffold"
```

---

## Task 10: Context Hygiene — Update AI Tool Entry Points

**Files:**
- Modify: `CLAUDE.md`
- Modify: `GEMINI.md`
- Modify: `AGENTS.md`
- Modify: `.context/INSTRUCTIONS.md`

- [ ] **Step 1: Overwrite `CLAUDE.md` with thin pointer**

```markdown
# Claude Code — AI Musings

Read these files before doing anything:
- `.context/INSTRUCTIONS.md` — project rules and context hygiene
- `.context/LOG.md` — recent project activity
- If working on a specific experiment: `content/experiments/[slug]/.context/BRIEF.md`, `STACK.md`, `LOG.md`

Never store facts in this file. This is a routing file only.
```

- [ ] **Step 2: Overwrite `GEMINI.md` with thin pointer**

```markdown
# Gemini CLI — AI Musings

Read these files before doing anything:
- `.context/INSTRUCTIONS.md` — project rules and context hygiene
- `.context/LOG.md` — recent project activity
- If working on a specific experiment: `content/experiments/[slug]/.context/BRIEF.md`, `STACK.md`, `LOG.md`

Never store facts in this file. This is a routing file only.
```

- [ ] **Step 3: Overwrite `AGENTS.md` with thin pointer**

```markdown
# AI Agents — AI Musings

Read these files before doing anything:
- `.context/INSTRUCTIONS.md` — project rules and context hygiene
- `.context/LOG.md` — recent project activity
- If working on a specific experiment: `content/experiments/[slug]/.context/BRIEF.md`, `STACK.md`, `LOG.md`

Never store facts in this file. This is a routing file only.
```

- [ ] **Step 4: Append context hygiene rules to `.context/INSTRUCTIONS.md`**

Add this section to the bottom of the existing `.context/INSTRUCTIONS.md`:

```markdown

## Context Hygiene Rules (Multi-Model)

These rules apply regardless of which AI tool is being used (Claude, Gemini, Kilocode, etc.):

1. After any task, append a dated line to the nearest LOG.md (project or experiment level).
   Format: `[YYYY-MM-DD] [SECTION] Done — [decision or note]`
2. `content/experiments/[slug]/meta.ts` is the only source of truth for structured facts (tags, status, series, type, date). Never duplicate these in markdown.
3. `BRIEF.md` is written once at experiment creation. Only update it if the concept pivots significantly.
4. `STACK.md` is updated when a tech decision changes — not after every session.
5. `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` are routing files only — never store facts in them.
6. When switching AI tools mid-experiment, read LOG.md first to understand the current state.
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md GEMINI.md AGENTS.md .context/INSTRUCTIONS.md
git commit -m "chore: update AI tool entry points to thin pointers, add context hygiene rules"
```

---

## Task 11: Full Build Verification

- [ ] **Step 1: Run the full build**

```bash
npm run build
```

Expected: build completes with no errors. `out/` directory created.

- [ ] **Step 2: Verify HTML was synced**

```bash
ls out/experiments/threshold/
```
Expected: `threshold.html` present.

- [ ] **Step 3: Verify static pages were generated**

```bash
ls out/musings/experiments/
```
Expected: `index.html`, `threshold/` directory.

- [ ] **Step 4: Run dev server for final smoke test**

```bash
npm run dev
```

Check:
- `http://localhost:3000/musings/experiments` → gallery with threshold card, tag/series filters visible
- `http://localhost:3000/musings/experiments/threshold` → iframe renders threshold.html with nav header
- `http://localhost:3000/musings/experiments/threshold/embed` → fullscreen iframe, no nav
- Click a tag badge → gallery filters to matching experiments
- Click a series badge → gallery filters correctly

- [ ] **Step 5: Final commit and push**

```bash
git add -A
git commit -m "chore: verified full build and smoke test"
git push origin main
```

---

## Adding a New Experiment (Post-Setup)

1. Copy `content/experiments/_template/` to `content/experiments/[your-slug]/`
2. Fill in `meta.ts` — slug, title, description, date, type, tags, series
3. Add import + entry to `lib/experiments.ts` registry array
4. For React experiments: build your component in `component.tsx`, update `[slug]/page.tsx` to import it
5. For iframe experiments: drop your HTML file in the folder, set `type: 'iframe'` and `iframeSrc` in meta
6. Run `npm run dev` — experiment appears in gallery automatically
