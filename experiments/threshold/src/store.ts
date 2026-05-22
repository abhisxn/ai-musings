import { create } from 'zustand'
import { GestureType, HallucinatedControl } from './types'

export type RenderMode = 'radio' | 'dots' | 'blocks' | 'particles' | 'ascii' | 'pixel' | 'spectral'

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

  inverse: boolean
  setInverse: (val: boolean) => void
  
  // Modes
  viewMode: 'flat' | 'volumetric'
  setViewMode: (val: 'flat' | 'volumetric') => void

  renderMode: RenderMode
  setRenderMode: (val: RenderMode) => void
  
  theme: 'dark' | 'light' | 'acid' | 'heatmap'
  setTheme: (val: 'dark' | 'light' | 'acid' | 'heatmap') => void

  sourceMode: 'pixel' | 'ai'
  setSourceMode: (val: 'pixel' | 'ai') => void

  showGrid: boolean
  setShowGrid: (val: boolean) => void
  
  // Audio
  audioEnabled: boolean
  setAudioEnabled: (val: boolean) => void
  audioReactive: boolean
  setAudioReactive: (val: boolean) => void
  soundType: 'sine' | 'chimes' | 'bells' | 'pulse'
  setSoundType: (val: 'sine' | 'chimes' | 'bells' | 'pulse') => void
  volume: number
  setVolume: (val: number) => void

  // AI Composer State (NEW)
  currentGesture: GestureType | null
  setCurrentGesture: (gesture: GestureType | null) => void

  currentMode: 'glitch' | 'bloom' | 'bass' | null
  setCurrentMode: (mode: 'glitch' | 'bloom' | 'bass' | null) => void

  hallucinatedControls: HallucinatedControl[]
  spawnHallucinatedControls: (controls: HallucinatedControl[]) => void
  
  currentShader: string | null
  setCurrentShader: (shader: string | null) => void
  
  audioProfile: string | null
  setAudioProfile: (profile: string | null) => void
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
  
  extrusion: 3.0,
  setExtrusion: (extrusion) => set({ extrusion }),

  inverse: false,
  setInverse: (inverse) => set({ inverse }),
  
  viewMode: 'flat',
  setViewMode: (viewMode) => set({ viewMode }),

  renderMode: 'radio',
  setRenderMode: (renderMode) => set({ renderMode }),
  
  theme: 'dark',
  setTheme: (theme) => set({ theme }),

  sourceMode: 'pixel',
  setSourceMode: (sourceMode) => set({ sourceMode }),

  showGrid: true,
  setShowGrid: (showGrid) => set({ showGrid }),
  
  audioEnabled: false,
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  audioReactive: true,
  setAudioReactive: (audioReactive) => set({ audioReactive }),
  soundType: 'chimes',
  setSoundType: (soundType) => set({ soundType }),
  volume: -12,
  setVolume: (volume) => set({ volume }),

  // AI Composer State (NEW)
  currentGesture: null,
  setCurrentGesture: (gesture) => set({ currentGesture: gesture }),

  currentMode: null,
  setCurrentMode: (mode) => set({ currentMode: mode }),

  hallucinatedControls: [],
  spawnHallucinatedControls: (controls) => set({ hallucinatedControls: controls }),
  
  currentShader: null,
  setCurrentShader: (shader) => set({ currentShader: shader }),
  
  audioProfile: null,
  setAudioProfile: (profile) => set({ audioProfile: profile }),
}))
