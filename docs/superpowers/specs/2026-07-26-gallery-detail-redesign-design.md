# AI Musings Gallery/Detail Redesign — Case-Study Pages

Design spec. Builds directly on top of "Lab Notebook, Glass Edition" (`docs/superpowers/specs/2026-07-22-visual-redesign-design.md`), which is already merged to `main`. This spec does not change tokens, fonts, motion primitives, or the `(chrome)` route-group isolation established there — it reworks the gallery card, the nav, the routing structure, and the experiment detail page on top of that foundation.

## Context

The shell redesign landed the visual language (glass cards, tokens, `next-themes`, `(chrome)` route group) but the gallery/detail pages themselves are still structurally generic — no thumbnails, cards double as detail pages via iframe embed, and there's no case-study content anywhere. The user wants the gallery and detail pages to follow the construction pattern of `thatguyabhishek.com` and its case-study detail page (`/work/excel-charting-ai-powered-chart-design-recommendations`): a card grid with real thumbnails leading to a dedicated case-study page, which in turn links out to the live project rather than embedding it inline.

**Explicit constraint carried through this entire spec and its implementation: only the gallery/nav/detail-page chrome changes. `experiments/threshold/src/**` (the actual experiment code) is untouched.** The only change inside `experiments/threshold/` is populating the `thumbnail` field in `meta.ts`.

Only one real experiment (`threshold`) exists today; `_template` is scaffold only (per [[project_only_threshold]]). All layout decisions below must degrade sensibly for a single-card grid, since that's the actual current state.

## Decisions locked with the user

1. **Routing**: flatten fully. `/musings/` serves the gallery directly (no redirect page); experiment detail pages move from `/musings/experiments/[slug]` to `/musings/[slug]`; the existing embed route moves from `/musings/experiments/[slug]/embed` to `/musings/[slug]/embed`.
2. **Nav**: strip to wordmark (links to `/musings/`) + `ThemeToggle` only. No nav links, no mobile hamburger/dropdown menu.
3. **Thumbnails**: every card needs a real image. For Threshold, a generated placeholder image (procedurally generated now, not a live capture) fills the `thumbnail` field — this can be swapped for a real screenshot/capture later without any structural change.
4. **Click flow**: gallery card → detail page (case study) → a distinct "Launch" action opens the actual running experiment (the embed route) fullscreen in a new tab. The card itself no longer embeds or previews the live experiment.
5. **Detail page content**: seven sections — About, What Was I Exploring, Key Learnings, Inner Workings, How To, Expectations, Versions — written now (this brainstorm), grounded in Threshold's real `.context/` docs and phase sprint history, not generic placeholder copy.
6. **Detail page layout**: 30/70 split, thatguyabhishek case-study style — left rail (30%) carries title/meta and a section-nav list; right column (70%) carries the section content in matching order.
7. **Hero banner**: a wide-crop (21:6) variant of the same generated thumbnail image, sitting above the 30/70 split, with the "Launch Threshold ↗" action overlaid on it (bottom-right) rather than placed in the left rail.

## Approaches considered

- **Card still embeds a live iframe preview** (rejected) — matches the old pattern but contradicts the explicit request for a card → detail → launch flow, and is expensive to render N times in a grid as more experiments are added.
- **Detail page embeds the experiment inline below the case-study content** (rejected) — user explicitly wants the live project to open fullscreen in a new tab, not inline, echoing thatguyabhishek's case-study pattern where the live artifact is a separate destination.
- **Chosen**: card → static thumbnail + copy → detail page (case study, all content, hero with overlay launch button) → new tab → embed route (unchanged mechanism, new path). This is the minimum structural change that satisfies all 8 requested changes and reuses the existing embed route as-is (only its URL moves).

## Routing changes

- Delete `app/page.tsx` (the meta-refresh redirect to `/musings/experiments`). The gallery becomes the literal root: `app/(chrome)/page.tsx` (moved from `app/(chrome)/experiments/page.tsx`).
- Rename `app/(chrome)/experiments/[slug]/page.tsx` → `app/(chrome)/[slug]/page.tsx`.
- Rename `app/experiments/[slug]/embed/page.tsx` → `app/[slug]/embed/page.tsx` (stays outside `(chrome)`, per the existing embed-isolation guarantee from the shell redesign — unchanged reasoning, just a shallower path).
- Delete the now-empty `app/experiments/` directory entirely.
- Any internal links (`Nav` wordmark, `ExperimentCard` hrefs, "Launch" button hrefs) updated to the new flat paths. With `basePath: '/musings'` already set in `next.config.ts`, this yields `/musings/`, `/musings/threshold/`, `/musings/threshold/embed/` as the final public URLs.
- No other route or registry changes — `lib/experiments.ts`'s slug-based lookup (`getExperimentBySlug`) is unaffected by the URL flattening.

## Nav changes

`components/nav/Nav.tsx`: delete `NAV_LINKS`, delete the mobile hamburger button, the `AnimatePresence` dropdown menu, and all associated mobile-menu state/handlers. Keep the wordmark (update its `href` to `/`) and `ThemeToggle`. The floating glass pill shrinks to fit its two remaining children; no responsive/mobile-menu breakpoint logic is needed since there's nothing left to collapse.

## Gallery card

New design for `components/gallery/ExperimentCard.tsx` (layout "A" from the approved mockup — compact/dense, not the editorial alternative):

- **Thumbnail**: 4:3 image at the top of the card, `rounded-t-card`, sourced from `meta.thumbnail`. Card `img` fills the frame (`object-cover`); no gradient/pattern is generated at render time — the gradient look in the mockup is baked into the placeholder image asset itself (see Thumbnail asset below).
- **Body padding**: 20px on all sides, consistent with the double-bezel `Card` shell already established in the shell redesign.
- **Tags row**: pill badges (reusing the existing restyled `Badge` component) for `series` and `status`, stacked horizontally above the title, 6px gap.
- **Title**: `meta.title`, `.t-h4`-equivalent size.
- **Subcopy**: one new required field, `meta.summary` (short, single-sentence explainer — distinct from the existing longer `meta.description`, which continues to serve the detail page's About section). For Threshold: "A webcam turned into a volumetric instrument — real-time depth, gesture, and generative sound built from a single video feed."
- **Click target**: the whole card links to `/[slug]` (the detail page). No embed, no iframe, no live preview anywhere in the grid.
- `components/gallery/ExperimentGrid.tsx`'s existing bento/single-item-branch layout logic is unaffected — only the card's internals change.

## Detail page

`app/(chrome)/[slug]/page.tsx`, rebuilt around a `components/experiment/CaseStudyLayout.tsx` (new; replaces the current `ExperimentLayout.tsx`'s non-embed branch — the embed route keeps using whatever minimal chrome-free layout it already has, untouched):

**Hero banner**: full-width, 21:6 aspect ratio, `meta.hero` image (wide-crop variant of the same placeholder asset as the thumbnail — same generated visual, different crop, not a distinct asset). "Launch `{title}` ↗" button overlaid bottom-right on the banner via absolute positioning, `href` pointing to `/[slug]/embed`, `target="_blank" rel="noopener noreferrer"`. This is the only place the live experiment is reachable from the detail page.

**30/70 split**, below the hero:
- **Left rail (30%)**: eyebrow meta line (`series · status`, small-caps, matching the gallery card's tag styling but as text rather than pills), `title` as a large heading, then a vertical list of the 7 section names as anchor links (`→ About`, `→ What Was I Exploring`, etc.). No launch button here (per approved option B) — the rail is pure navigation/orientation. On desktop, the rail is `position: sticky` within its column so it stays visible while the body scrolls; each section-nav link highlights (opacity/color shift, no layout shift) when its corresponding section is the current scroll-spy target. Scroll-spy implemented with `IntersectionObserver` on each section's heading, client-side only (`'use client'` island wrapping just the rail, since the rest of the page can stay server-rendered).
- **Right column (70%)**: the 7 sections in fixed order, each a `<section id="...">` with a heading matching the rail's link text, rendered from static content (see Content below) — plain typographic sections using existing `.t-h5`/`.t-body1` scale classes, no new visual components needed beyond spacing/rhythm (`space-y-*` between sections).

Mobile: rail collapses above the body (stacked, not sticky — matches how the existing shell redesign already treats other two-column layouts at narrow widths, no new breakpoint pattern introduced).

## Content model changes

`lib/types.ts` `ExperimentMeta` gains one new required field and repurposes `thumbnail`:

- `thumbnail: string` (already exists, currently unused) — now required, used for the gallery card's 4:3 image. Populated for Threshold.
- `hero: string` (new, required) — wide-crop variant path for the detail-page banner. Populated for Threshold.
- `summary: string` (new, required) — the one-sentence card subcopy, distinct from `description` (which is longer and feeds the About section's opening).
- `caseStudy: { about: string; exploring: string; learnings: string; innerWorkings: string; howTo: string; expectations: string; versions: string }` (new, required) — the 7 section bodies, stored as markdown-capable strings (plain paragraphs/bold/lists, rendered via the project's existing markdown approach if one exists, otherwise plain JSX with `<strong>`/`<ul>` — implementation plan to confirm which the codebase already has).

Since only Threshold exists, these fields become required on the type (not optional) — there is no second experiment to be lenient for, and `_template`'s scaffold meta is not part of the statically-imported registry (per [[project_only_threshold]]), so it doesn't need to satisfy the stricter type today.

## Thumbnail/hero asset

Both `thumbnail` (4:3) and `hero` (21:6) are crops of a single generated placeholder image evoking Threshold's actual on-screen palette (warm ink/amber/rust gradient, echoing the mockup's `#2a2118 → #4a3826 → #8a5a2e → #c98a3e` progression) rather than a literal screenshot — generated once during implementation and saved under `public/experiments/threshold/` (or equivalent existing public-asset location), referenced by path from `meta.ts`. This keeps the door open to replace it later with a real capture without touching any component code.

## Case-study content (final, approved)

All 7 sections, in full, for `experiments/threshold/meta.ts`'s `caseStudy` field:

### About
Threshold turns a webcam into a volumetric instrument. Point it at yourself and an AI depth model, gesture tracking, and a generative audio engine take over — your face and hands become a live field of ASCII glyphs, dithered blocks, or particles, extruded by depth and colored by mood, with a soundtrack that reacts to how much you move.

It's built entirely client-side: React Three Fiber and Three.js for rendering, Transformers.js for depth estimation, MediaPipe for hand tracking, Tone.js for audio, Zustand for state, Leva for the control panel. No backend, no accounts, nothing leaves your browser.

### What Was I Exploring
The premise was simple to state and hard to build: what if a webcam filter wasn't flat? Most "AI camera effects" apply a 2D mask over your face. I wanted the camera feed to become actual topography — a grid of shapes physically pushed forward and back by an AI's read of depth, in real time, at 60fps.

The aesthetic brief I gave myself was "high-fidelity terminal" — somewhere between MSCHF's absurdist repurposing, early Flash-era web experiments, Yugo Nakamura's interaction design, and Ryoji Ikeda's audiovisual minimalism. Scanlines, chromatic aberration, volumetric bloom, a monospace hardware feel. The Leva control panel needed to look like a lab workstation, not a debug menu.

One rule I set early and kept: no static pre-processing. Whatever showed up on screen had to be computed live, every frame, from whatever the camera saw that instant.

### Key Learnings
**Full AI depth estimation was too slow for a live mirror.** I started with Transformers.js's `depth-anything-small-hf` running per-frame, and it couldn't hold 60fps. I replaced the primary interactive loop with real-time pixel-to-luminance sampling instead — a pragmatic trade that kept the feel of depth without the AI model in the hot path. True per-pixel depth inference still exists in the codebase, but it's not what drives the live experience.

**Two coloring systems disagreeing looks like a bug — because it is one.** Mood color (`chromeColor`, an emissive tint) and mode color (`getGradientColor`, a diffuse gradient) were built as separate systems and would occasionally contradict each other, reading as random flicker. The fix wasn't a patch — it was making mood the single source of truth for hue when mood mode is on.

**A missing feature can look identical to a rendering bug.** The ASCII mode had a full glyph atlas texture wired up, but no per-cell UV-offset logic — so every cell silently rendered the same glyph. It looked like a broken shader. It was an incomplete one. Fixed with an `InstancedBufferAttribute` and a shader patch via `onBeforeCompile`.

**Audio reliability bugs are usually race conditions in disguise.** Three separate places called `Promise.race([Tone.start(), timeout(500)])` without ever checking whether the audio context had actually resumed. Under load, all three could "succeed" against the timeout while the context stayed suspended — silent audio, no error. The fix was a single shared `ensureAudioContext()` gate that awaits the real context state.

**Perceptual and linear scales don't mix.** Default volume was 33dB quieter than intended because per-layer gain reductions compounded on a linear dB curve. Swapping in a perceptual `volumeToDb` mapping fixed it in one pass.

### Inner Workings
The pipeline, roughly:

**Webcam → signal.** The camera feed feeds two paths: brightness sampling for the live depth-proxy, and MediaPipe hand tracking (throttled to every third frame to manage GPU heat) for gesture control.

**Signal → state.** Everything lands in a single Zustand store — render mode, theme, mood, gesture state, session energy.

**State → render.** An R3F `InstancedMesh` scene reads the store every frame, coloring each cell via the shared gradient system in `theme.ts`. A fixed post-processing chain runs on top: Bloom → HueSaturation → ChromaticAberration → Glitch → Scanline → Noise → Vignette.

**State → audio.** A parallel Tone.js engine builds textures (glitch, bloom, bass) and a Markov-chain melody generator, driven by the same motion-energy signal that drives the visuals.

Two systems run orthogonally on top of all this: **mood** (manual — five palettes, each with its own scale, tempo, waveform, and texture) and **session arc** (automatic — an energy meter from 0–100 that charges from movement and decays over time, moving you through calm → building → climax phases with hysteresis so it doesn't flicker between states).

### How To
Nothing to install — grant camera access and it starts. A few ways in:

- **Gestures** (edge-triggered, once the camera's on): fist = next render mode, open palm = next theme, pinch = toggle the session arc. Pinch distance also live-drives the depth-cutoff threshold.
- **Keyboard**: `1`–`7` jump directly to a render mode (radio, dots, blocks, lines, ascii, pixel, spectral), `T` cycles theme, `M` cycles mood, `0` toggles mood/arc mode, spacebar flips between flat and volumetric camera views.
- **Leva panel**: five folders — Signal, Visuals, View, Audio, Gesture — for anyone who wants to hand-tune instead of gesture their way through it.
- **Onboarding**: a replayable walkthrough lives behind the `?` icon if you want the guided version first.

### Expectations
This needs a webcam and a browser gesture (a click) before audio will play — standard autoplay policy, not a bug. It leans on WebGL and on-device inference, so it wants a reasonably modern machine; on weaker hardware, expect fan noise before you expect frame drops.

It's an experiment, not a product. Some of the internal naming has aged in ways I've left alone on purpose — the "sound texture" options (glitch/bloom/bass) happen to share names with unrelated post-processing effects, a coincidence from building fast rather than a designed pun. Nothing here is trying to be finished software; it's trying to be an honest record of a specific idea, worked all the way through.

### Versions
**Apr 2026 — V3 build-out.** Core stack assembled: R3F, Zustand, Tone.js, Leva, Transformers.js. First depth-estimation integration, radio/blocks/particles render modes, four themes, the initial post-processing chain, terminal HUD. Mid-build pivot from AI depth to real-time pixel sampling for performance.

**May 2026 — Stabilization.** Fixed core render-mode logic, added the spectral mode, redesigned the heatmap theme, refactored the codebase into its current `src/` structure.

**Jul 2026, Phase 2 — Visual language.** Rebuilt theming as a single source of truth (`theme.ts`, `dither.ts`), unified the gradient/color model across modes, restyled the Leva panel to match the terminal aesthetic.

**Jul 2026, Phase 3 — Sound & gesture.** Fixed the audio-context race condition, added gesture-driven controls, shipped the onboarding walkthrough.

**Jul 2026, Phase 4 — Legibility & performance.** Fixed Leva panel resync, removed a post-effect that was costing more heat than it was worth to the visual, corrected the volume curve, split up modes that had been sharing logic.

**Jul 2026, Phase 5 — Mood unification.** Fixed the two-coloring-systems bug, fixed the ASCII glyph bug, expanded mood from three palettes to five, added a legibility HUD and a depth-driven grid warp effect.

## Cleanup in scope

- Delete `app/page.tsx` (redirect shim, superseded by the gallery becoming the literal root).
- Delete the emptied `app/experiments/` directory tree once both routes have moved.
- Remove `NAV_LINKS`, mobile hamburger, and dropdown-menu code from `components/nav/Nav.tsx`.
- Rename `components/experiment/ExperimentLayout.tsx`'s non-embed responsibilities into the new `CaseStudyLayout.tsx` — the file is being restructured, not just restyled, since the section rail/scroll-spy is new behavior, not a copy change.

## Out of scope

- `experiments/threshold/src/**` — no changes to the experiment's own code, rendering, audio, or in-canvas theme system.
- `experiments/threshold/meta.ts` gets touched only to add `thumbnail`, `hero`, `summary`, and `caseStudy` fields — no changes to existing fields (`slug`, `title`, `description`, `date`, `type`, `status`, `tags`, `series`).
- Design tokens, fonts, motion primitives, `(chrome)` route-group isolation mechanism — all established by the prior shell redesign and unchanged here.
- Any second experiment's content or thumbnail — only Threshold exists; the registry/type changes must not block a future experiment from being added, but no scaffolding for one is being built now.
- Real photography/screenshot capture for the thumbnail/hero — a generated placeholder is explicitly the agreed interim asset.
