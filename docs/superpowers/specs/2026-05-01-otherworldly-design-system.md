# Design Spec: Otherworldly Terminal HUD

## Aesthetic Vision
A hybrid of "Neon Void" (high-contrast neons) and "Cryptic Artifact" (brutalist, glitchy monochrome). The UI should feel like an alien terminal or a corrupted system artifact.

## Core Palette
### Dark Theme (System Standard)
- **Base (Void):** `#000000`
- **Surface (Terminal):** `#050505`
- **Text (Primary):** `#e0e0e0`
- **Text (Muted):** `#555555`
- **Accent (Neon):** `#00ff00` (Toxic Green) / `#ffae00` (Stark Amber)
- **Border:** `#222222`

### Light Theme (Bleached Artifact)
- **Base:** `#f5f5f5`
- **Surface:** `#ffffff`
- **Text (Primary):** `#000000`
- **Text (Muted):** `#777777`
- **Accent:** `#00aa00` / `#cc8800`
- **Border:** `#cccccc`

## Typography
- **Primary:** `Share Tech Mono` (Terminal feel)
- **Accent:** Aggressive letter-spacing, uppercase for headers, mixed weights.

## HUD Elements & Effects
- **CRT Scanlines:** Subtle fixed overlay using `linear-gradient`.
- **Glitch:** Hover effects causing text jitter and RGB split (`text-shadow`).
- **ASCII Borders:** Using pseudo-elements or specific characters (`[ ]`, `+--+`, `|`) for component containers.
- **Custom Cursor:** Inverse color block or crosshair.
- **Scrollbar:** Neon thumb, transparent track, 4px width.

## Implementation Tasks

### 1. Global Styles & Config
- [ ] Update `tailwind.config.js` with theme colors and glitch keyframes.
- [ ] Update `app/globals.css` with global HUD overlays (Scanlines, Glitch base, Scrollbar).

### 2. UI Components
- [ ] **Badge**: Terminal-style toggle (`[ ON ]` / `[ OFF ]`), aggressive accent colors.
- [ ] **Card**: ASCII-style corners, glitch-on-hover for titles, CRT-filtered images.

### 3. Layouts & Pages
- [ ] **Root Layout**: Add global HUD containers (scanline overlay, vignette).
- [ ] **Experiments Page**: Add ASCII header decoration and cryptic data status line.
- [ ] **Experiment Card**: Add "glitch-in" animation and tech metadata.
