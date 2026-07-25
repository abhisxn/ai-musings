# AI Musings Visual Redesign — "Lab Notebook, Glass Edition"

Design spec. See companion implementation plan: `docs/plans/2026-07-22-visual-redesign-implementation-plan.md`.

## Context

AI Musings currently carries a deliberate dark "Terminal HUD" identity (CRT scanlines, vignette, neon green, Share Tech Mono, glitch text), documented as an intentional 2026-05-01 decision in `.context/LOG.md`. The user wants a full aesthetic pivot, using their personal site `/Users/abhishek/thatguyabhishek` as the construction-technique reference (Next.js 16, Tailwind v4, Glory+Manrope fonts, layered CSS-variable tokens, glass double-bezel cards, gradient-blob backgrounds, `next-themes` light/dark parity, Framer Motion with a shared ease-out-expo curve) — but with its own distinct color identity so the two sites don't read as twins.

Scoped to the site **shell** only: gallery page, nav, footer, experiment-page chrome. Threshold's own in-canvas theme system (`experiments/threshold/src/theme.ts`, Leva controls, WebGL palettes) is explicitly out of scope — it's already properly isolated per existing per-experiment-isolation goals (see `docs/superpowers/specs/2026-07-22-per-experiment-isolation-design.md`). As a byproduct, this redesign also resolves the previously-noted "global CRT overlay leak," since removing the HUD overlay from `app/layout.tsx` was already required by the new shell identity.

Decisions locked with the user:
- **Scope**: shell only, not Threshold internals.
- **Aesthetic**: full pivot to editorial-glass, not a dark-hybrid.
- **Theme**: full working light/dark parity via `next-themes` (today's `.light` CSS class is dead/unwired).
- **Fonts**: reuse thatguyabhishek's exact pairing (Glory + Manrope) for brand continuity across the user's properties.
- **Embed route fix**: route-group split — move Nav/Footer/decor out of root `app/layout.tsx` into a new route group wrapping only the gallery + experiment detail pages, so the existing chrome-free `/embed` route (used to iframe Threshold elsewhere) is structurally guaranteed to stay chrome-free.

## Identity

"Lab Notebook, Glass Edition" — same construction techniques as the reference site (token layering, double-bezel glass cards, gradient-blob backgrounds, grain overlay, floating glass nav), different palette: warm ink instead of navy, amber/rust instead of indigo, teal as secondary — reads as an experiments notebook, not a corporate portfolio.

## Design tokens

Layered as CSS custom properties in `app/globals.css`: `:root` = dark (default), `[data-theme="light"]` = override. Mapped into `tailwind.config.js` `theme.extend.colors` via `var(--token-name)` so components use Tailwind classes (`bg-surface-1`, `text-fg`, `border-border-1`, etc.), never raw hex.

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#120f0d` | `#f7f3ec` |
| `--color-fg` | `#f2ede6` | `#1c1917` |
| `--color-accent` | `#f0a020` | `#f0a020` |
| `--color-secondary` | `#2fb8a8` | `#2fb8a8` |
| `--color-surface-1/2/3` | white @ 3/6/10% | ink @ 3/5/9% |
| `--color-border-1/2` | white @ 10/22% | ink @ 8/18% |
| `--color-success/warning/error/info` | `#34d399`/`#f0a020`/`#f0645a`/`#2fb8a8` (+ 12%-opacity `-bg` variant each, same both themes) |

`--radius-btn: 8px`, `--radius-card: 24px`, `--radius-pill: 100px`. `--ease-standard: cubic-bezier(0.22, 1, 0.36, 1)` used for all transitions/animations.

## Typography

`next/font/google`: Glory (400–800, display/headings) + Manrope (400–700, body), exposed as `--font-glory`/`--font-manrope` CSS vars, mapped to Tailwind `fontFamily.display`/`fontFamily.body`. Fluid clamp-based type scale as utility classes in `globals.css`: `.t-display`, `.t-h1`–`.t-h5`, `.t-body1`–`.t-body3`, `.t-caption` (uppercase, tracked, for eyebrow/tag labels).

## Motion

`framer-motion` + central `lib/motion.ts` exporting `fadeUp` (opacity+translateY32+blur16→0, 0.8s, `ease-standard`), `stagger` (staggerChildren 0.1), and a shared `viewport = { once: true, margin: '-80px' }` for `whileInView` triggers. No smooth-scroll library (Lenis) — avoids interfering with Threshold's iframe'd WebGL canvas. Respect `prefers-reduced-motion` via framer-motion's `useReducedMotion`.

## Component inventory

### New signature components
- **`components/decor/GradientBackground.tsx`** — 2–3 large blurred radial-gradient blobs, ambient CSS-keyframe drift only (`transform`/`opacity`, no mouse-follow), theme-aware amber/rust/teal palette, `pointer-events-none`, fixed, `-z-10`. Server Component (pure CSS).
- **`components/decor/GrainOverlay.tsx`** — inline SVG `feTurbulence` data-URI on a `fixed inset-0 pointer-events-none` div, ~0.03 opacity. Server Component.
- **`components/nav/Nav.tsx`** — floating glass pill, fixed/detached (`mt-6 mx-auto w-max rounded-full backdrop-blur`), logo/wordmark + links + `ThemeToggle`. `'use client'` for mobile hamburger→X morph + staggered link reveal (using `lib/motion.ts` presets).
- **`components/nav/Footer.tsx`** — new; simple, same glass/pill visual language, static.
- **`components/theme/ThemeProvider.tsx`** — thin `next-themes` wrapper, `attribute="data-theme"`, `defaultTheme="dark"`, `enableSystem={false}`.
- **`components/theme/ThemeToggle.tsx`** — `useTheme()` with the standard mounted-state hydration guard.

### Restyled components (keep existing props/APIs stable)
- **`components/ui/Badge.tsx`** — pill (`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]`), drop `●`/`○`/`text-glow`, active state = accent bg/border swap.
- **`components/ui/Card.tsx`** — replace ASCII-corner-bracket decoration with double-bezel: outer shell (`ring-1 ring-border-1 bg-surface-1 p-1.5 rounded-card`) wrapping inner core (`bg-surface-2 rounded-[calc(var(--radius-card)-0.5rem)]`, inset highlight).
- **`components/gallery/ExperimentCard.tsx`** — remove the `Math.random()` fake-hex-ID overlay, `[ NO_VISUAL_DATA ]`, `ID:`/`[STATUS]` terminal copy, grayscale-hover; rewrite to plain descriptive copy + subtle `whileHover` scale/opacity motion. Keeps using `Card`/`Badge` as before.
- **`components/gallery/ExperimentGrid.tsx`** — replace "Filter_Module" bordered box with a pill-filter row (reuse restyled `Badge` as chips). Replace `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with an asymmetrical bento (`grid-cols-1 md:grid-cols-3 auto-rows-[minmax(0,1fr)] gap-6`, first item `md:col-span-2 md:row-span-2`), with an explicit single-item branch that renders one full-width card (today's real state — only Threshold exists). Restyle empty-state copy.
- **`components/experiment/ExperimentLayout.tsx`** — restyle only the non-embed header: convert the border-bottom bar into an in-content "you are here" bar (back-link pill + tag badges) sitting below the global Nav — not a second competing floating pill. The `embed` branch stays structurally untouched.
- **`app/experiments/page.tsx`** — rewrite the inline `AI.MUSINGS.INF` / `REC ●` / `SYSTEM_STATUS`/`ARCHIVE_COUNT`/`LOCAL_TIME` HUD header block to a plain typographic hero using `.t-display`/`.t-h1`, optional `fadeUp` on mount.
- **`components/experiment/ExperimentView.tsx`** — light copy/style touch-up only on the `LOADING EXPERIMENT...` pulse text (shell-level, not Threshold internals).

## Layout/routing change (embed isolation fix)

Move Nav/Footer/GradientBackground/GrainOverlay out of root `app/layout.tsx` into a new route group, `app/(chrome)/layout.tsx`, wrapping `app/experiments/page.tsx` and `app/experiments/[slug]/page.tsx`. Root `app/layout.tsx` stays minimal: fonts, `ThemeProvider`, and `GrainOverlay` only (grain is a cheap universal texture, not "site chrome"). `GradientBackground`/`Nav`/`Footer` live inside `(chrome)`. The existing `/embed` route (`app/experiments/[slug]/embed/page.tsx`) stays outside `(chrome)`, so it structurally cannot inherit Nav/Footer/GradientBackground — no pathname-checking logic needed.

## Cleanup in scope

- Remove `.hud-overlay`/`.hud-scanline`/`.vignette` divs from `app/layout.tsx` and their CSS from `globals.css`.
- Remove `Share Tech Mono` `<link>` font tag and the `cursor: crosshair` body rule.
- Delete `shared/hud.css` (confirmed zero references anywhere).
- Remove `tailwind.config.js`'s `void`/`neon`/`artifact` color blocks, `glitch`/`scanline` keyframes, and `fontFamily.mono`/`fontFamily.system` once nothing references them.
- Final grep sweep: `grep -rn "neon-\|void-\|artifact-\|glitch\|hud-\|ascii-border\|text-glow" app components` must return zero hits before calling this done.
- Leave the Leva `[class*="leva-"]` monospace CSS override untouched — it targets Threshold's own controls, independent of the global font choice.

## Out of scope

- `experiments/threshold/src/theme.ts`, Leva controls, WebGL canvas styling, or any other Threshold-internal visuals.
- Any change to the static-export architecture (`output: 'export'`, `basePath`, `lib/experiments.ts` static-import registry pattern).
- Tailwind major-version upgrade (staying on v3.4.19 — tokens are implemented as CSS custom properties, which works fine on v3).
