# Gallery/Detail Case-Study Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flatten the gallery/detail routing, strip the nav to a wordmark + theme toggle, redesign the gallery card with a real thumbnail and explainer subcopy, and rebuild the experiment detail page as a 30/70 case-study layout (hero banner with an overlaid "Launch" action, sticky section-nav rail, seven written content sections) — without touching `experiments/threshold/src/**`.

**Architecture:** Pure Next.js App Router route/component changes on top of the already-merged "Lab Notebook, Glass Edition" shell (tokens, fonts, `(chrome)` route group, `next-themes`). No new dependencies. Case-study copy lives as structured data (`CaseStudyContent`) on `ExperimentMeta` rather than markdown, since the codebase has no markdown renderer — this avoids introducing one for a single experiment's worth of content. Placeholder thumbnail/hero images are hand-authored SVGs (no image-generation tooling in this environment, and SVG needs no binary asset pipeline under `images: { unoptimized: true }`).

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind, Framer Motion, `next-themes`. Test runner: Vitest, currently scoped to `experiments/**/*.test.ts(x)` only (`vitest.config.ts`) — there is no existing test coverage for `app/`, `components/`, or `lib/`, and no `jsdom`/`@testing-library` setup. This plan does not expand that scope (would be new infra, out of scope for a routing/copy change) except for one data-shape test on `experiments/threshold/meta.ts`, which already falls inside the existing `experiments/**` glob. Everywhere else, verification is `tsc --noEmit`, `npm run build` (the static export must succeed), and a manual dev-server check in the browser — consistent with how the prior shell redesign was verified.

---

## File Structure

**Create:**
- `public/experiments/threshold/thumbnail.svg` — 4:3 gradient placeholder for the gallery card
- `public/experiments/threshold/hero.svg` — 21:6 wide-crop gradient placeholder for the detail-page banner
- `components/experiment/caseStudySections.ts` — the fixed, ordered list of 7 section `{id, label}` pairs, shared by the rail nav and the body
- `components/experiment/SectionNav.tsx` — client-only scroll-spy rail nav (the only client island on the detail page)
- `components/experiment/CaseStudyLayout.tsx` — server component: hero banner + overlaid launch button + 30/70 split + all 7 sections
- `experiments/threshold/meta.test.ts` — data-shape test for the new required meta fields (falls under the existing `experiments/**` Vitest glob)

**Modify:**
- `lib/types.ts` — add `summary`, `hero`, `caseStudy` (required), promote `thumbnail` to required
- `experiments/threshold/meta.ts` — populate the new fields
- `components/nav/Nav.tsx` — strip to wordmark + `ThemeToggle`
- `components/gallery/ExperimentCard.tsx` — 4:3 thumbnail, tags-then-title-then-summary body, link target flattens to `/${slug}`
- `components/ui/Card.tsx` — add optional `contentClassName` prop (default `'p-4'`) so `ExperimentCard` can render a flush, full-bleed thumbnail

**Move (git mv, path only):**
- `app/(chrome)/experiments/page.tsx` → `app/(chrome)/page.tsx`
- `app/(chrome)/experiments/[slug]/page.tsx` → `app/(chrome)/[slug]/page.tsx` (content also rewritten, see Task 5)
- `app/experiments/[slug]/embed/page.tsx` → `app/[slug]/embed/page.tsx` (content also rewritten, see Task 6)

**Delete:**
- `app/page.tsx` (redirect shim — gallery is now the literal root)
- `components/experiment/ExperimentLayout.tsx` (both its branches are replaced: non-embed by `CaseStudyLayout`, embed by an inline wrapper in the embed page)
- `app/experiments/` directory, once empty

**Untouched:**
- `components/experiment/ExperimentView.tsx`, `components/experiment/ExperimentFrame.tsx` — still used, unchanged, by the embed route
- `experiments/threshold/src/**` — no changes
- `lib/experiments.ts`, `lib/motion.ts`, tokens, fonts, `(chrome)/layout.tsx` — no changes

---

### Task 1: Extend `ExperimentMeta` with case-study fields

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the new types and required fields**

Replace the full contents of `lib/types.ts` with:

```ts
export type ExperimentType = 'react' | 'iframe'
export type ExperimentStatus = 'live' | 'wip' | 'archived'

export interface CaseStudyParagraph {
  lead?: string
  text: string
}

export interface CaseStudyListItem {
  lead: string
  text: string
}

export interface CaseStudyContent {
  about: CaseStudyParagraph[]
  exploring: CaseStudyParagraph[]
  learnings: CaseStudyParagraph[]
  innerWorkings: CaseStudyParagraph[]
  howTo: {
    intro: string
    items: CaseStudyListItem[]
  }
  expectations: CaseStudyParagraph[]
  versions: CaseStudyListItem[]
}

export interface ExperimentMeta {
  slug: string
  title: string
  description: string
  summary: string        // one-sentence gallery-card subcopy
  date: string           // ISO date e.g. "2026-04-30"
  type: ExperimentType
  status: ExperimentStatus
  tags: string[]
  series?: string
  thumbnail: string      // path relative to /public, 4:3, e.g. "/experiments/threshold/thumbnail.svg"
  hero: string           // path relative to /public, 21:6, e.g. "/experiments/threshold/hero.svg"
  caseStudy: CaseStudyContent
  iframeSrc?: string     // required when type === 'iframe', e.g. "/musings/threshold/embed"
}
```

- [ ] **Step 2: Confirm the type change breaks the existing meta (expected)**

Run: `npx tsc --noEmit`
Expected: FAIL — `experiments/threshold/meta.ts` errors with something like `Property 'summary' is missing in type ... but required in type 'ExperimentMeta'` (and similarly for `hero`/`caseStudy`, and `thumbnail` now required). This confirms the type change is live; Task 2 fixes it.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add case-study content fields to ExperimentMeta"
```

---

### Task 2: Placeholder thumbnail/hero assets + populate Threshold's meta

**Files:**
- Create: `public/experiments/threshold/thumbnail.svg`
- Create: `public/experiments/threshold/hero.svg`
- Modify: `experiments/threshold/meta.ts`
- Test: `experiments/threshold/meta.test.ts`

- [ ] **Step 1: Write the failing data-shape test**

Create `experiments/threshold/meta.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import meta from './meta'

describe('threshold meta', () => {
  it('has thumbnail and hero image paths', () => {
    expect(meta.thumbnail).toMatch(/^\/experiments\/threshold\/.+\.svg$/)
    expect(meta.hero).toMatch(/^\/experiments\/threshold\/.+\.svg$/)
  })

  it('has a one-sentence summary distinct from the longer description', () => {
    expect(meta.summary.length).toBeGreaterThan(0)
    expect(meta.summary).not.toEqual(meta.description)
  })

  it('has all seven case study sections populated', () => {
    expect(meta.caseStudy.about.length).toBeGreaterThan(0)
    expect(meta.caseStudy.exploring.length).toBeGreaterThan(0)
    expect(meta.caseStudy.learnings.length).toBeGreaterThan(0)
    expect(meta.caseStudy.innerWorkings.length).toBeGreaterThan(0)
    expect(meta.caseStudy.howTo.items.length).toBeGreaterThan(0)
    expect(meta.caseStudy.expectations.length).toBeGreaterThan(0)
    expect(meta.caseStudy.versions.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run experiments/threshold/meta.test.ts`
Expected: FAIL — `TypeError: Cannot read properties of undefined (reading 'length')` (or similar), since `meta.caseStudy`/`meta.thumbnail`/`meta.hero`/`meta.summary` don't exist yet.

- [ ] **Step 3: Create the placeholder thumbnail SVG (4:3)**

Create `public/experiments/threshold/thumbnail.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a2118" />
      <stop offset="40%" stop-color="#4a3826" />
      <stop offset="75%" stop-color="#8a5a2e" />
      <stop offset="100%" stop-color="#c98a3e" />
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#g)" />
</svg>
```

- [ ] **Step 4: Create the placeholder hero SVG (21:6, same gradient)**

Create `public/experiments/threshold/hero.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 300" width="1050" height="300">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a2118" />
      <stop offset="40%" stop-color="#4a3826" />
      <stop offset="75%" stop-color="#8a5a2e" />
      <stop offset="100%" stop-color="#c98a3e" />
    </linearGradient>
  </defs>
  <rect width="1050" height="300" fill="url(#g)" />
</svg>
```

- [ ] **Step 5: Populate `experiments/threshold/meta.ts`**

Replace the full contents of `experiments/threshold/meta.ts` with:

```ts
import { ExperimentMeta } from '@/lib/types'

const meta: ExperimentMeta = {
  slug: 'threshold',
  title: 'Threshold v5',
  description: 'Volumetric terminal instrument. AI depth estimation.',
  summary: 'A webcam turned into a volumetric instrument — real-time depth, gesture, and generative sound built from a single video feed.',
  date: '2026-04-30',
  type: 'react',
  status: 'wip',
  tags: ['vision', 'audio', 'terminal', 'camera', 'webgl', 'ai'],
  series: 'perception',
  thumbnail: '/experiments/threshold/thumbnail.svg',
  hero: '/experiments/threshold/hero.svg',
  caseStudy: {
    about: [
      {
        text: "Threshold turns a webcam into a volumetric instrument. Point it at yourself and an AI depth model, gesture tracking, and a generative audio engine take over — your face and hands become a live field of ASCII glyphs, dithered blocks, or particles, extruded by depth and colored by mood, with a soundtrack that reacts to how much you move.",
      },
      {
        text: "It's built entirely client-side: React Three Fiber and Three.js for rendering, Transformers.js for depth estimation, MediaPipe for hand tracking, Tone.js for audio, Zustand for state, Leva for the control panel. No backend, no accounts, nothing leaves your browser.",
      },
    ],
    exploring: [
      {
        text: "The premise was simple to state and hard to build: what if a webcam filter wasn't flat? Most \"AI camera effects\" apply a 2D mask over your face. I wanted the camera feed to become actual topography — a grid of shapes physically pushed forward and back by an AI's read of depth, in real time, at 60fps.",
      },
      {
        text: "The aesthetic brief I gave myself was \"high-fidelity terminal\" — somewhere between MSCHF's absurdist repurposing, early Flash-era web experiments, Yugo Nakamura's interaction design, and Ryoji Ikeda's audiovisual minimalism. Scanlines, chromatic aberration, volumetric bloom, a monospace hardware feel. The Leva control panel needed to look like a lab workstation, not a debug menu.",
      },
      {
        text: "One rule I set early and kept: no static pre-processing. Whatever showed up on screen had to be computed live, every frame, from whatever the camera saw that instant.",
      },
    ],
    learnings: [
      {
        lead: 'Full AI depth estimation was too slow for a live mirror.',
        text: "I started with Transformers.js's depth-anything-small-hf running per-frame, and it couldn't hold 60fps. I replaced the primary interactive loop with real-time pixel-to-luminance sampling instead — a pragmatic trade that kept the feel of depth without the AI model in the hot path. True per-pixel depth inference still exists in the codebase, but it's not what drives the live experience.",
      },
      {
        lead: 'Two coloring systems disagreeing looks like a bug — because it is one.',
        text: "Mood color (chromeColor, an emissive tint) and mode color (getGradientColor, a diffuse gradient) were built as separate systems and would occasionally contradict each other, reading as random flicker. The fix wasn't a patch — it was making mood the single source of truth for hue when mood mode is on.",
      },
      {
        lead: 'A missing feature can look identical to a rendering bug.',
        text: "The ASCII mode had a full glyph atlas texture wired up, but no per-cell UV-offset logic — so every cell silently rendered the same glyph. It looked like a broken shader. It was an incomplete one. Fixed with an InstancedBufferAttribute and a shader patch via onBeforeCompile.",
      },
      {
        lead: 'Audio reliability bugs are usually race conditions in disguise.',
        text: 'Three separate places called Promise.race([Tone.start(), timeout(500)]) without ever checking whether the audio context had actually resumed. Under load, all three could "succeed" against the timeout while the context stayed suspended — silent audio, no error. The fix was a single shared ensureAudioContext() gate that awaits the real context state.',
      },
      {
        lead: "Perceptual and linear scales don't mix.",
        text: 'Default volume was 33dB quieter than intended because per-layer gain reductions compounded on a linear dB curve. Swapping in a perceptual volumeToDb mapping fixed it in one pass.',
      },
    ],
    innerWorkings: [
      {
        lead: 'Webcam → signal.',
        text: 'The camera feed feeds two paths: brightness sampling for the live depth-proxy, and MediaPipe hand tracking (throttled to every third frame to manage GPU heat) for gesture control.',
      },
      {
        lead: 'Signal → state.',
        text: 'Everything lands in a single Zustand store — render mode, theme, mood, gesture state, session energy.',
      },
      {
        lead: 'State → render.',
        text: 'An R3F InstancedMesh scene reads the store every frame, coloring each cell via the shared gradient system in theme.ts. A fixed post-processing chain runs on top: Bloom → HueSaturation → ChromaticAberration → Glitch → Scanline → Noise → Vignette.',
      },
      {
        lead: 'State → audio.',
        text: 'A parallel Tone.js engine builds textures (glitch, bloom, bass) and a Markov-chain melody generator, driven by the same motion-energy signal that drives the visuals.',
      },
      {
        text: "Two systems run orthogonally on top of all this: mood (manual — five palettes, each with its own scale, tempo, waveform, and texture) and session arc (automatic — an energy meter from 0–100 that charges from movement and decays over time, moving you through calm → building → climax phases with hysteresis so it doesn't flicker between states).",
      },
    ],
    howTo: {
      intro: "Nothing to install — grant camera access and it starts. A few ways in:",
      items: [
        {
          lead: 'Gestures',
          text: "(edge-triggered, once the camera's on): fist = next render mode, open palm = next theme, pinch = toggle the session arc. Pinch distance also live-drives the depth-cutoff threshold.",
        },
        {
          lead: 'Keyboard',
          text: '1–7 jump directly to a render mode (radio, dots, blocks, lines, ascii, pixel, spectral), T cycles theme, M cycles mood, 0 toggles mood/arc mode, spacebar flips between flat and volumetric camera views.',
        },
        {
          lead: 'Leva panel',
          text: 'five folders — Signal, Visuals, View, Audio, Gesture — for anyone who wants to hand-tune instead of gesture their way through it.',
        },
        {
          lead: 'Onboarding',
          text: 'a replayable walkthrough lives behind the ? icon if you want the guided version first.',
        },
      ],
    },
    expectations: [
      {
        text: "This needs a webcam and a browser gesture (a click) before audio will play — standard autoplay policy, not a bug. It leans on WebGL and on-device inference, so it wants a reasonably modern machine; on weaker hardware, expect fan noise before you expect frame drops.",
      },
      {
        text: "It's an experiment, not a product. Some of the internal naming has aged in ways I've left alone on purpose — the \"sound texture\" options (glitch/bloom/bass) happen to share names with unrelated post-processing effects, a coincidence from building fast rather than a designed pun. Nothing here is trying to be finished software; it's trying to be an honest record of a specific idea, worked all the way through.",
      },
    ],
    versions: [
      {
        lead: 'Apr 2026 — V3 build-out.',
        text: 'Core stack assembled: R3F, Zustand, Tone.js, Leva, Transformers.js. First depth-estimation integration, radio/blocks/particles render modes, four themes, the initial post-processing chain, terminal HUD. Mid-build pivot from AI depth to real-time pixel sampling for performance.',
      },
      {
        lead: 'May 2026 — Stabilization.',
        text: 'Fixed core render-mode logic, added the spectral mode, redesigned the heatmap theme, refactored the codebase into its current src/ structure.',
      },
      {
        lead: 'Jul 2026, Phase 2 — Visual language.',
        text: 'Rebuilt theming as a single source of truth (theme.ts, dither.ts), unified the gradient/color model across modes, restyled the Leva panel to match the terminal aesthetic.',
      },
      {
        lead: 'Jul 2026, Phase 3 — Sound & gesture.',
        text: 'Fixed the audio-context race condition, added gesture-driven controls, shipped the onboarding walkthrough.',
      },
      {
        lead: 'Jul 2026, Phase 4 — Legibility & performance.',
        text: 'Fixed Leva panel resync, removed a post-effect that was costing more heat than it was worth to the visual, corrected the volume curve, split up modes that had been sharing logic.',
      },
      {
        lead: 'Jul 2026, Phase 5 — Mood unification.',
        text: 'Fixed the two-coloring-systems bug, fixed the ASCII glyph bug, expanded mood from three palettes to five, added a legibility HUD and a depth-driven grid warp effect.',
      },
    ],
  },
}

export default meta
```

- [ ] **Step 6: Run the test and `tsc` again, confirm both pass**

Run: `npx vitest run experiments/threshold/meta.test.ts && npx tsc --noEmit`
Expected: PASS on both.

- [ ] **Step 7: Commit**

```bash
git add public/experiments/threshold/thumbnail.svg public/experiments/threshold/hero.svg experiments/threshold/meta.ts experiments/threshold/meta.test.ts
git commit -m "feat(threshold): add thumbnail/hero placeholders and case-study content"
```

---

### Task 3: `Card` component — optional flush content padding

**Files:**
- Modify: `components/ui/Card.tsx`

- [ ] **Step 1: Add the `contentClassName` prop**

Replace the full contents of `components/ui/Card.tsx` with:

```tsx
interface CardProps {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  onClick?: () => void
}

export function Card({ children, className = '', contentClassName = 'p-4', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        h-full flex flex-col
        ring-1 ring-border-1 bg-surface-1 p-1.5 rounded-card transition-all duration-300
        hover:ring-border-2 hover:shadow-[0_0_24px_theme(colors.accent/0.12)]
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className={`h-full flex flex-col bg-surface-2 rounded-[calc(var(--radius-card)-0.5rem)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden ${contentClassName}`}>
        {children}
      </div>
    </div>
  )
}
```

(`overflow-hidden` added so a flush-edge thumbnail image respects the inner rounded corners when `contentClassName="p-0"` is passed.)

- [ ] **Step 2: Verify no other caller breaks**

Run: `grep -rn "<Card" app components --include="*.tsx"`
Expected: only `components/gallery/ExperimentCard.tsx` matches (confirmed during planning) — the default `contentClassName = 'p-4'` keeps that caller's current look until Task 4 updates it.

- [ ] **Step 3: Commit**

```bash
git add components/ui/Card.tsx
git commit -m "feat(ui): let Card opt out of inner content padding"
```

---

### Task 4: Redesign `ExperimentCard`

**Files:**
- Modify: `components/gallery/ExperimentCard.tsx`

- [ ] **Step 1: Replace the component**

Replace the full contents of `components/gallery/ExperimentCard.tsx` with:

```tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ExperimentMeta } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface ExperimentCardProps {
  experiment: ExperimentMeta
}

const statusLabel: Record<ExperimentMeta['status'], string> = {
  live: 'Live',
  wip: 'WIP',
  archived: 'Archived',
}

const cardVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
}

const imageVariants = {
  rest: { opacity: 0.85, scale: 1.02 },
  hover: { opacity: 1, scale: 1.06, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  return (
    <Link
      href={`/${experiment.slug}`}
      className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-card"
    >
      <motion.div
        className="h-full"
        initial="rest"
        whileHover="hover"
        variants={cardVariants}
        whileTap={{ scale: 0.99 }}
      >
        <Card className="h-full" contentClassName="p-0">
          <div className="relative aspect-[4/3] overflow-hidden bg-surface-3">
            <motion.img
              src={experiment.thumbnail}
              alt={experiment.title}
              className="w-full h-full object-cover"
              variants={imageVariants}
            />
          </div>

          <div className="flex flex-col gap-2.5 p-5">
            <div className="flex flex-wrap gap-1.5">
              {experiment.series && <Badge label={experiment.series} active />}
              <Badge label={statusLabel[experiment.status]} />
            </div>
            <h2 className="t-h5 text-fg">{experiment.title}</h2>
            <p className="t-body3 text-fg/70 leading-relaxed">{experiment.summary}</p>
          </div>
        </Card>
      </motion.div>
    </Link>
  )
}
```

- [ ] **Step 2: Run `tsc`**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/gallery/ExperimentCard.tsx
git commit -m "feat(gallery): redesign card with 4:3 thumbnail, tags, and summary"
```

---

### Task 5: Strip `Nav` to wordmark + theme toggle

**Files:**
- Modify: `components/nav/Nav.tsx`

- [ ] **Step 1: Replace the component**

Replace the full contents of `components/nav/Nav.tsx` with:

```tsx
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-40 flex justify-center pt-4 sm:pt-6 px-4">
      <nav
        className="w-full max-w-3xl mx-auto flex items-center justify-between gap-3
                   px-4 sm:px-5 py-2
                   rounded-pill
                   bg-surface-1 backdrop-blur-xl backdrop-saturate-150
                   border border-border-1
                   shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
        aria-label="Primary"
      >
        <Link
          href="/"
          className="font-display text-base sm:text-lg tracking-tight text-fg hover:text-accent transition-colors rounded-btn focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          AI&nbsp;<span className="text-accent">Musings</span>
        </Link>

        <ThemeToggle />
      </nav>
    </header>
  )
}
```

Note this component no longer needs `'use client'`, `useState`, `framer-motion`, or `lib/motion` — all removed, since there's no mobile menu left to animate. (`ThemeToggle` itself remains a client component internally; that's unaffected.)

- [ ] **Step 2: Run `tsc`**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/nav/Nav.tsx
git commit -m "feat(nav): strip to wordmark and theme toggle only"
```

---

### Task 6: Case-study section list + scroll-spy rail nav

**Files:**
- Create: `components/experiment/caseStudySections.ts`
- Create: `components/experiment/SectionNav.tsx`

- [ ] **Step 1: Create the shared section list**

Create `components/experiment/caseStudySections.ts`:

```ts
export const CASE_STUDY_SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'exploring', label: 'What Was I Exploring' },
  { id: 'learnings', label: 'Key Learnings' },
  { id: 'inner-workings', label: 'Inner Workings' },
  { id: 'how-to', label: 'How To' },
  { id: 'expectations', label: 'Expectations' },
  { id: 'versions', label: 'Versions' },
] as const
```

- [ ] **Step 2: Create the scroll-spy rail nav**

Create `components/experiment/SectionNav.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { CASE_STUDY_SECTIONS } from './caseStudySections'

export function SectionNav() {
  const [activeId, setActiveId] = useState<string>(CASE_STUDY_SECTIONS[0].id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )

    const elements = CASE_STUDY_SECTIONS
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <ul className="flex flex-col gap-1 t-body3">
      {CASE_STUDY_SECTIONS.map(({ id, label }) => (
        <li key={id}>
          <a
            href={`#${id}`}
            className={`block py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-btn ${
              activeId === id ? 'text-accent' : 'text-fg/60 hover:text-fg'
            }`}
          >
            → {label}
          </a>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: Run `tsc`**

Run: `npx tsc --noEmit`
Expected: PASS (both files are currently unused, which `tsc --noEmit` does not flag — they'll be wired up in Task 7).

- [ ] **Step 4: Commit**

```bash
git add components/experiment/caseStudySections.ts components/experiment/SectionNav.tsx
git commit -m "feat(experiment): add case-study section list and scroll-spy nav"
```

---

### Task 7: `CaseStudyLayout` component

**Files:**
- Create: `components/experiment/CaseStudyLayout.tsx`

- [ ] **Step 1: Create the layout**

Create `components/experiment/CaseStudyLayout.tsx`:

```tsx
import Link from 'next/link'
import { ExperimentMeta, CaseStudyParagraph } from '@/lib/types'
import { SectionNav } from './SectionNav'

interface CaseStudyLayoutProps {
  meta: ExperimentMeta
}

const statusLabel: Record<ExperimentMeta['status'], string> = {
  live: 'Live',
  wip: 'WIP',
  archived: 'Archived',
}

function Paragraphs({ items }: { items: CaseStudyParagraph[] }) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <p key={i} className="t-body1 text-fg/80">
          {item.lead && <strong className="text-fg">{item.lead} </strong>}
          {item.text}
        </p>
      ))}
    </div>
  )
}

export function CaseStudyLayout({ meta }: CaseStudyLayoutProps) {
  const cs = meta.caseStudy
  const eyebrow = meta.series ? `${meta.series} · ${statusLabel[meta.status]}` : statusLabel[meta.status]

  return (
    <article className="max-w-6xl mx-auto px-4 pb-24">
      <div className="relative w-full aspect-[21/6] rounded-card overflow-hidden mb-10 bg-surface-3">
        <img src={meta.hero} alt={meta.title} className="w-full h-full object-cover" />
        <Link
          href={`/${meta.slug}/embed`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-accent text-on-accent t-body3 font-semibold hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Launch {meta.title} ↗
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        <aside className="md:w-[30%] md:sticky md:top-28 md:self-start flex flex-col gap-4 h-fit">
          <p className="t-caption text-fg/50 uppercase tracking-wide">{eyebrow}</p>
          <h1 className="t-h1 text-fg">{meta.title}</h1>
          <SectionNav />
        </aside>

        <div className="md:w-[70%] flex flex-col gap-14">
          <section id="about" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">About</h2>
            <Paragraphs items={cs.about} />
          </section>

          <section id="exploring" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">What Was I Exploring</h2>
            <Paragraphs items={cs.exploring} />
          </section>

          <section id="learnings" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">Key Learnings</h2>
            <Paragraphs items={cs.learnings} />
          </section>

          <section id="inner-workings" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">Inner Workings</h2>
            <Paragraphs items={cs.innerWorkings} />
          </section>

          <section id="how-to" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">How To</h2>
            <p className="t-body1 text-fg/80">{cs.howTo.intro}</p>
            <ul className="flex flex-col gap-3">
              {cs.howTo.items.map((item, i) => (
                <li key={i} className="t-body1 text-fg/80">
                  <strong className="text-fg">{item.lead}:</strong> {item.text}
                </li>
              ))}
            </ul>
          </section>

          <section id="expectations" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">Expectations</h2>
            <Paragraphs items={cs.expectations} />
          </section>

          <section id="versions" className="flex flex-col gap-4">
            <h2 className="t-h3 text-fg">Versions</h2>
            <ul className="flex flex-col gap-4">
              {cs.versions.map((v, i) => (
                <li key={i} className="t-body1 text-fg/80">
                  <strong className="text-fg">{v.lead}</strong> {v.text}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Run `tsc`**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/experiment/CaseStudyLayout.tsx
git commit -m "feat(experiment): add 30/70 case-study layout with hero launch button"
```

---

### Task 8: Flatten routing — gallery to `/`, detail to `/[slug]`

**Files:**
- Delete: `app/page.tsx`
- Move: `app/(chrome)/experiments/page.tsx` → `app/(chrome)/page.tsx` (no content change)
- Move+rewrite: `app/(chrome)/experiments/[slug]/page.tsx` → `app/(chrome)/[slug]/page.tsx`
- Delete: `components/experiment/ExperimentLayout.tsx`

- [ ] **Step 1: Delete the redirect shim**

```bash
git rm app/page.tsx
```

- [ ] **Step 2: Move the gallery page**

```bash
mkdir -p "app/(chrome)"
git mv "app/(chrome)/experiments/page.tsx" "app/(chrome)/page.tsx"
```

- [ ] **Step 3: Move and rewrite the detail page**

```bash
git mv "app/(chrome)/experiments/[slug]/page.tsx" "app/(chrome)/[slug]/page.tsx"
```

Replace the full contents of `app/(chrome)/[slug]/page.tsx` with:

```tsx
import { notFound } from 'next/navigation'
import { getAllExperiments, getExperimentBySlug } from '@/lib/experiments'
import { CaseStudyLayout } from '@/components/experiment/CaseStudyLayout'

export async function generateStaticParams() {
  return getAllExperiments().map(e => ({ slug: e.slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ExperimentPage({ params }: Props) {
  const { slug } = await params
  const meta = getExperimentBySlug(slug)
  if (!meta) notFound()

  return <CaseStudyLayout meta={meta} />
}
```

- [ ] **Step 4: Delete `ExperimentLayout` (fully superseded)**

```bash
git rm components/experiment/ExperimentLayout.tsx
```

- [ ] **Step 5: Confirm nothing else imports the deleted file**

Run: `grep -rn "ExperimentLayout" app components --include="*.tsx"`
Expected: no matches (Task 9 will finish removing the last reference in the embed page — if this greps a hit in `app/experiments/[slug]/embed/page.tsx`, that's expected until Task 9 runs; do not treat that as a failure here).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(routing): flatten gallery to / and detail page to /[slug]"
```

---

### Task 9: Move and fix the embed route

**Files:**
- Move+rewrite: `app/experiments/[slug]/embed/page.tsx` → `app/[slug]/embed/page.tsx`
- Delete: `app/experiments/` directory (now empty)

The current embed page only knows how to render `type: 'iframe'` experiments via `ExperimentFrame` directly, showing a "not yet connected" placeholder for `type: 'react'` — which is what Threshold actually is. Since the embed route is now the sole destination for the detail page's "Launch" action, it must actually render Threshold. `ExperimentView` already handles both cases (it dynamically imports Threshold for `slug === 'threshold'`), so switching to it is a required fix here, not a new feature — the embed route's entire purpose is to render the live experiment fullscreen, and today it can't for the one experiment that exists.

- [ ] **Step 1: Move the embed page**

```bash
mkdir -p "app/[slug]"
git mv "app/experiments/[slug]/embed/page.tsx" "app/[slug]/embed/page.tsx"
```

- [ ] **Step 2: Rewrite it to use `ExperimentView`**

Replace the full contents of `app/[slug]/embed/page.tsx` with:

```tsx
import { notFound } from 'next/navigation'
import { getAllExperiments, getExperimentBySlug } from '@/lib/experiments'
import { ExperimentView } from '@/components/experiment/ExperimentView'

export async function generateStaticParams() {
  return getAllExperiments().map(e => ({ slug: e.slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ExperimentEmbedPage({ params }: Props) {
  const { slug } = await params
  const meta = getExperimentBySlug(slug)
  if (!meta) notFound()

  return (
    <div className="w-screen h-screen overflow-hidden">
      <ExperimentView meta={meta} />
    </div>
  )
}
```

- [ ] **Step 3: Remove the now-empty `app/experiments/` directory**

```bash
find app/experiments -type f
```
Expected: no output (only the now-moved files lived there). Then:

```bash
rmdir "app/experiments/[slug]/embed" "app/experiments/[slug]" "app/experiments" 2>/dev/null; find app/experiments -type d 2>/dev/null
```
Expected: no output (directory gone). If any of the `rmdir` calls fail because a stray file remains, stop and inspect with `find app/experiments -type f` before deleting anything further.

- [ ] **Step 4: Confirm `ExperimentLayout` has no remaining references**

Run: `grep -rn "ExperimentLayout" app components --include="*.tsx"`
Expected: no matches.

- [ ] **Step 5: Run `tsc`**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix(embed): move embed route to /[slug]/embed and render via ExperimentView"
```

---

### Task 10: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, zero errors.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS, including the new `experiments/threshold/meta.test.ts` (existing `experiments/threshold/src/__tests__/**` suite must still be fully green — this plan touches nothing under `experiments/threshold/src/`, so a failure there means something outside this plan's scope broke and should be investigated separately).

- [ ] **Step 3: Static export build**

Run: `npm run build`
Expected: succeeds; output lists `/`, `/threshold`, `/threshold/embed` (no `/experiments*` paths) among the generated routes.

- [ ] **Step 4: Grep sweep for stale paths**

Run: `grep -rn "/experiments/" app components lib --include="*.tsx" --include="*.ts"`
Expected: no matches (confirms no leftover hardcoded links to the old route shape).

- [ ] **Step 5: Manual browser check**

Run: `npm run dev`, then in a browser:
- Visit `/musings/` (root) — gallery renders directly, no redirect flash, nav shows only the wordmark + theme toggle.
- Click the Threshold card — lands on `/musings/threshold/`, hero banner visible with "Launch Threshold v5 ↗" button overlaid bottom-right, left rail shows eyebrow/title/section list, right column shows all 7 sections in order.
- Scroll the body — confirm the rail's active section-nav item highlights as each section crosses into view, and the rail stays visible (sticky) while scrolling on desktop width.
- Click "Launch Threshold v5 ↗" — opens `/musings/threshold/embed/` in a new tab, fullscreen, no nav/footer chrome, and the actual Threshold experience loads (camera permission prompt, etc.) rather than a placeholder.
- Toggle the theme switch — confirm both gallery and detail pages render correctly in light and dark.

Report any visual issue found here before considering the plan complete — this is the one check nothing above automates.

- [ ] **Step 6: Final commit if Step 5 required fixes**

If Step 5 surfaced any fix, commit it separately with a message describing what broke and why (e.g. `fix(detail): correct sticky rail offset on desktop`). If Step 5 required no changes, there is nothing to commit here.
