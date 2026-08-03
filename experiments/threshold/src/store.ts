import { create } from 'zustand'
import { GestureTrackingStatus, HandTracking, Mood, Phase } from './types'

export const RENDER_MODES = ['radio', 'dots', 'blocks', 'hline', 'vline', 'ascii', 'pixel', 'ribbon', 'dither'] as const
export type RenderMode = (typeof RENDER_MODES)[number]

export const THEMES_LIST = ['dark', 'light', 'acid', 'heatmap'] as const
export type Theme = (typeof THEMES_LIST)[number]

interface ThresholdState {
  // UI / Global
  initialized: boolean
  setInitialized: (val: boolean) => void
  
  // Hardware
  videoElement: HTMLVideoElement | null
  setVideoElement: (el: HTMLVideoElement | null) => void
  
  // Settings
  resolution: number
  setResolution: (val: number) => void
  
  threshold: number
  setThreshold: (val: number) => void
  
  extrusion: number
  setExtrusion: (val: number) => void

  ditherIntensity: number
  setDitherIntensity: (val: number) => void

  inverse: boolean
  setInverse: (val: boolean) => void
  
  // Modes
  viewMode: 'flat' | 'volumetric'
  setViewMode: (val: 'flat' | 'volumetric') => void

  renderMode: RenderMode
  setRenderMode: (val: RenderMode) => void
  
  theme: Theme
  setTheme: (val: Theme) => void

  sourceMode: 'pixel' | 'demo'
  setSourceMode: (val: 'pixel' | 'demo') => void

  showGrid: boolean
  setShowGrid: (val: boolean) => void

  // Session Arc
  moodEnabled: boolean
  setMoodEnabled: (val: boolean) => void
  currentMood: Mood
  setCurrentMood: (mood: Mood) => void
  sessionEnergy: number
  setSessionEnergy: (val: number) => void
  currentPhase: Phase
  setCurrentPhase: (phase: Phase) => void
  
  // Audio
  audioEnabled: boolean
  setAudioEnabled: (val: boolean) => void
  audioReactive: boolean
  setAudioReactive: (val: boolean) => void
  volume: number
  setVolume: (val: number) => void

  zoneEnergy: [number, number, number]
  setZoneEnergy: (energy: [number, number, number]) => void

  // Hand Tracking (MediaPipe)
  handTracking: HandTracking
  setHandTracking: (handTracking: HandTracking) => void

  gestureTrackingStatus: GestureTrackingStatus
  setGestureTrackingStatus: (status: GestureTrackingStatus) => void

  // Transient VHS-glitch trigger: flipped true briefly on each hand-gesture edge.
  // Owned/written by Track E2 (UI chrome); read by Track E1 (Glitch post-fx).
  gestureGlitchActive: boolean
  setGestureGlitchActive: (val: boolean) => void

  soundTexture: 'off' | 'glitch' | 'bloom' | 'bass'
  setSoundTexture: (val: 'off' | 'glitch' | 'bloom' | 'bass') => void

  // Thermal Guard
  thermalRisk: 'low' | 'medium' | 'high'
  setThermalRisk: (val: 'low' | 'medium' | 'high') => void
  autoDowngradeEnabled: boolean
  setAutoDowngradeEnabled: (val: boolean) => void
  reducedQuality: boolean
  setReducedQuality: (val: boolean) => void

  // Frame skip for thermal throttle: 1 = 60fps, 2 = 30fps
  frameSkip: number
  setFrameSkip: (val: number) => void
}

export const useStore = create<ThresholdState>((set) => ({
  initialized: false,
  setInitialized: (initialized) => set({ initialized }),
  
  videoElement: null,
  setVideoElement: (videoElement) => set({ videoElement }),
  
  resolution: 64,
  setResolution: (resolution) => set({ resolution }),
  
  threshold: 0.5,
  setThreshold: (threshold) => set({ threshold }),
  
  extrusion: 6.0,
  setExtrusion: (extrusion) => set({ extrusion }),

  ditherIntensity: 0.3,
  setDitherIntensity: (ditherIntensity) => set({ ditherIntensity }),

  inverse: false,
  setInverse: (inverse) => set({ inverse }),
  
  viewMode: 'flat',
  setViewMode: (viewMode) => set({ viewMode }),

  renderMode: 'dots' as RenderMode,
  setRenderMode: (renderMode) => set({ renderMode }),
  
  theme: 'dark',
  setTheme: (theme) => set({ theme }),

  sourceMode: 'pixel',
  setSourceMode: (sourceMode) => set({ sourceMode }),

  showGrid: true,
  setShowGrid: (showGrid) => set({ showGrid }),

  // Session Arc
  moodEnabled: true,
  setMoodEnabled: (moodEnabled) => set({ moodEnabled }),
  currentMood: 'pulse' as Mood,
  setCurrentMood: (currentMood) => set({ currentMood }),
  sessionEnergy: 0,
  setSessionEnergy: (sessionEnergy) => set({ sessionEnergy }),
  currentPhase: 'calm' as Phase,
  setCurrentPhase: (currentPhase) => set({ currentPhase }),
  
  audioEnabled: true,
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  audioReactive: true,
  setAudioReactive: (audioReactive) => set({ audioReactive }),
  volume: 75,
  setVolume: (volume) => set({ volume }),

  zoneEnergy: [0, 0, 0] as [number, number, number],
  setZoneEnergy: (zoneEnergy) => set({ zoneEnergy }),

  handTracking: {
    detected: false,
    wrist: null,
    pinchDistance: 0,
    proximity: 0,
    gesture: null,
    confidence: 0,
  },
  setHandTracking: (handTracking) => set({ handTracking }),

  gestureTrackingStatus: 'idle' as GestureTrackingStatus,
  setGestureTrackingStatus: (gestureTrackingStatus) => set({ gestureTrackingStatus }),

  gestureGlitchActive: false,
  setGestureGlitchActive: (gestureGlitchActive) => set({ gestureGlitchActive }),

  soundTexture: 'bloom' as 'off' | 'glitch' | 'bloom' | 'bass',
  setSoundTexture: (soundTexture) => set({ soundTexture }),

  // Thermal Guard (defaults: healthy, auto-downgrade on)
  thermalRisk: 'low' as 'low' | 'medium' | 'high',
  setThermalRisk: (thermalRisk) => set({ thermalRisk }),
  autoDowngradeEnabled: true,
  setAutoDowngradeEnabled: (autoDowngradeEnabled) => set({ autoDowngradeEnabled }),
  reducedQuality: false,
  setReducedQuality: (reducedQuality) => set({ reducedQuality }),

  frameSkip: 1,
  setFrameSkip: (frameSkip) => set({ frameSkip }),
}))
