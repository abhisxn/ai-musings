# AI Musings Visual Redesign — Implementation Plan

Companion spec: `docs/superpowers/specs/2026-07-22-visual-redesign-design.md` — read that first for the design rationale, tokens, and component specs. This document is the ordered execution plan only.

## New dependencies

`framer-motion`, `next-themes` — add via `npm install`; confirm no React 19 peer-dependency conflicts before proceeding.

## Phase A — Foundation (land completely before any component restyling)

1. `package.json` — add `framer-motion`, `next-themes`.
2. `tailwind.config.js` — remove `void`/`neon`/`artifact` color blocks, `glitch`/`scanline` keyframes, old `fontFamily.mono`/`fontFamily.system`; add semantic color map (`bg`, `fg`, `accent`, `secondary`, `surface.1-3`, `border.1-2`, `success`/`warning`/`error`/`info` + `-bg` variants) pointing at CSS vars; add `fontFamily.display`/`fontFamily.body`; add `borderRadius.btn/card/pill`. Keep `darkMode: 'class'`.
3. `app/globals.css` — replace old `:root`/`.light` block and all HUD-related CSS with the new token set (`:root` dark, `[data-theme="light"]` override), fluid type-scale utility classes. Keep the Leva `[class*="leva-"]` override untouched.
4. `lib/motion.ts` (new) — `fadeUp`, `stagger`, `viewport` exports per spec.
5. `components/theme/ThemeProvider.tsx` (new) — `'use client'`, wraps `next-themes`' `ThemeProvider` (`attribute="data-theme"`, `defaultTheme="dark"`, `enableSystem={false}`).
6. `components/theme/ThemeToggle.tsx` (new) — `'use client'`, `useTheme()`, hydration-safe mounted-state guard before rendering theme-dependent icon.
7. `app/layout.tsx` — remove Google Font `<link>` tags and the 3 HUD overlay divs (`.hud-overlay`/`.hud-scanline`/`.vignette`); add `next/font/google` Glory+Manrope imports and `.variable` classes on `<html>`; add `suppressHydrationWarning` on `<html>` (required by `next-themes`); wrap `children` in `<ThemeProvider>`; add `<GrainOverlay />` only — Nav/Footer/GradientBackground move to the Phase B route group, not here.

**Checkpoint**: `npm run build` — confirm the static export still succeeds with just tokens/fonts/theme-provider wired, before touching any component visuals. Cheapest point to catch `next/font`+`output:export` or `next-themes` server/client boundary issues.

## Phase B — Signature components + routing split

8. `components/decor/GradientBackground.tsx` (new) — Server Component, pure CSS blob drift.
9. `components/decor/GrainOverlay.tsx` (new) — Server Component, inline SVG turbulence.
10. `components/nav/Nav.tsx` (new, `'use client'`) — floating glass pill, mobile hamburger→X morph, staggered link reveal.
11. `components/nav/Footer.tsx` (new).
12. Create `app/(chrome)/layout.tsx` — renders `<GradientBackground />`, `<Nav />`, `{children}`, `<Footer />`. Move `app/experiments/page.tsx` and `app/experiments/[slug]/page.tsx` (non-embed detail route) under this group. Confirm `app/experiments/[slug]/embed/page.tsx` stays outside the group, untouched — this is the mechanism that keeps the embed route chrome-free (no pathname-checking logic needed).

## Phase C — Restyle existing components (props/APIs unchanged)

13. `components/ui/Badge.tsx`
14. `components/ui/Card.tsx`
15. `components/gallery/ExperimentCard.tsx`
16. `components/gallery/ExperimentGrid.tsx` — bento layout + explicit single-item full-width branch. Prove out the multi-item bento visually using local synthetic test data only (temporarily, never commit synthetic entries to `lib/experiments.ts`).
17. `components/experiment/ExperimentLayout.tsx` — non-embed header only; leave the `embed` branch's structure untouched.
18. `app/experiments/page.tsx` — rewrite inline HUD header block (`AI.MUSINGS.INF`, `REC ●`, `SYSTEM_STATUS`/`ARCHIVE_COUNT`/`LOCAL_TIME`) to plain typographic hero.
19. `components/experiment/ExperimentView.tsx` — loading-state copy/style touch-up.

## Phase D — Cleanup & verification

20. Delete `shared/hud.css`.
21. Grep sweep: `grep -rn "neon-\|void-\|artifact-\|glitch\|hud-\|ascii-border\|text-glow" app components` — must return zero hits.
22. `git status experiments/threshold/` — must show zero diff, confirming Threshold isolation held throughout.

## Sequencing & risk notes

- Land Phase A completely before touching any component visuals. Between Phase A and Phase C, old components referencing now-undefined `neon-green`/`void-*` Tailwind classes will silently lose those styles (Tailwind just won't emit unknown utilities) — not a crash, just a temporary rough look on a working branch. Keep A+B+C as one working session/PR rather than shipping A alone.
- The embed-route chrome-leak fix (step 12) is the highest-risk architectural piece — it's resolved structurally via the route group, not via runtime pathname checks, so get the route-group boundary right before building Nav/GradientBackground/Footer content.
- Threshold must never be re-touched: verify via `git status experiments/threshold/` after each phase.
- Confirm during the Phase A checkpoint build that font files are correctly emitted under `output: export` with `basePath: '/musings'` (inspect `out/_next/static/media/`).
- `next-themes` relies on an auto-injected blocking script for pre-hydration theme application — confirm this survives `output: export` (it's build-time HTML, should be fine, but verify no console warnings).

## Verification

1. `npm install` — confirm `framer-motion`/`next-themes` resolve cleanly against React 19.
2. `npm run dev` — manually check:
   - Gallery page: GradientBackground + grain render, Nav floats correctly, theme toggle flips all token-driven colors, single-experiment bento layout looks intentional.
   - Experiment detail page (`/experiments/threshold`): restyled header renders, Threshold's own canvas/Leva/theme visually unaffected, dynamic import still works.
   - `/experiments/threshold/embed`: confirm **zero** Nav/Footer/GradientBackground leak — pure chrome-free iframe content.
   - Toggle dark/light on both pages; check contrast, no flash-of-unstyled state; emulate `prefers-reduced-motion` and confirm `fadeUp`/stagger are suppressed.
3. `npm run build` — confirm static export completes, expected routes generate under `out/`, fonts correctly self-hosted/hashed.
4. `npx serve out` — sanity-check the exported build in a browser as it will actually be deployed.
5. Final grep sweep + `git status experiments/threshold/` per Phase D above.
