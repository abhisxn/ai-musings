import type { RenderMode, Theme } from './store'
import type { Mood } from './types'
import styles from './threshold.module.css'

const RENDER_MODE_DESC: Record<RenderMode, string> = {
  radio: 'Glow rings, brightness-driven radius',
  dots: 'Sphere field, position by brightness',
  blocks: 'Extruded cubes, height by brightness',
  lines: 'Horizontal scanlines',
  ascii: 'Live character glyphs, dense→sparse',
  pixel: 'Flat brightness grid',
  spectral: 'Live audio spectrum bars',
}

const THEME_DESC: Record<Theme, string> = {
  dark: 'Green phosphor on black',
  light: 'White on black',
  acid: 'Chartreuse high-contrast',
  heatmap: 'Blue→red thermal ramp',
}

const TEXTURE_DESC: Record<string, string> = {
  off: 'Silent',
  bloom: 'Bells and soft pads',
  glitch: 'Noise and digital fx',
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
