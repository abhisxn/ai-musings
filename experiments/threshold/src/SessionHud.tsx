import type { RenderMode, Theme } from './store'
import type { Mood } from './types'
import styles from './threshold.module.css'

const RENDER_MODE_DESC: Record<RenderMode, string> = {
  radio: 'Literal radio-button cells (ring + filled dot when active)',
  dots: 'Sphere field, center-distance falloff',
  blocks: 'Extruded cubes, 0.95 gap between cells',
  hline: 'Long horizontal lines (one per row)',
  vline: 'Long vertical lines (one per column)',
  ascii: '24-glyph ASCII portrait of the camera feed',
  pixel: 'Hard Bayer-dithered bitmap squares',
  ribbon: '3-band FFT, flowing horizontal bands',
  mesh: 'Continuous wireframe surface displaced by brightness',
  dither: 'Full Bayer-dithered halftone face',
}

const THEME_DESC: Record<Theme, string> = {
  dark: 'Green phosphor on black',
  light: 'White on black',
  acid: 'Chartreuse high-contrast',
  heatmap: 'Blue→red thermal ramp',
}

const TEXTURE_DESC: Record<string, string> = {
  off: 'Silent',
  ambient: 'Slow-drifting atmospheric pad',
  bloom: 'Bells and soft pads',
  bloom2: 'Bells + metallic chime arpeggios',
  glitch: 'Noise and digital fx',
  glitch2: 'Bit-crushed spectrum + slow freeze',
  pulse: 'Sub-kick + square-wave arpeggio',
  bass: 'Drone and low kick',
}

export interface SessionHudProps {
  renderMode: RenderMode
  theme: Theme
  moodEnabled: boolean
  currentMood: Mood
  soundTexture: string
}

export function SessionHud({ renderMode, theme, moodEnabled, currentMood, soundTexture }: SessionHudProps) {
  return (
    <div className={styles.legibilityHud}>
      <div className={styles.legibilityRow}>
        <span className={styles.legibilityLabel}>MODE // {renderMode.toUpperCase()}</span>
        <span className={styles.legibilityDesc}>{RENDER_MODE_DESC[renderMode]}</span>
      </div>
      <div className={styles.legibilityRow}>
        <span className={styles.legibilityLabel}>THEME // {theme.toUpperCase()}</span>
        <span className={styles.legibilityDesc}>{THEME_DESC[theme]}</span>
      </div>
      <div className={styles.legibilityRow}>
        <span className={styles.legibilityLabel}>ARC // {moodEnabled ? currentMood.toUpperCase() : 'OFF'}</span>
        <span className={styles.legibilityDesc}>
          {moodEnabled ? 'Mood-driven color + music cycle' : 'Manual theme + texture control'}
        </span>
      </div>
      <div className={styles.legibilityRow}>
        <span className={styles.legibilityLabel}>TEXTURE // {soundTexture.toUpperCase()}</span>
        <span className={styles.legibilityDesc}>{TEXTURE_DESC[soundTexture] ?? ''}</span>
      </div>
    </div>
  )
}
