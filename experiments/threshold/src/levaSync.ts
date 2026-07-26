import type { RenderMode, Theme } from './store'

export type LevaVisualsSyncPayload = {
  mode: RenderMode
  theme: Theme
  mood: boolean
}

export function buildLevaSyncPayload(
  renderMode: RenderMode,
  theme: Theme,
  moodEnabled: boolean,
): LevaVisualsSyncPayload {
  return { mode: renderMode, theme, mood: moodEnabled }
}
