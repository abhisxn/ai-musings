'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Bloom, EffectComposer, ChromaticAberration, Scanline, Noise, Vignette, HueSaturation, DepthOfField, Glitch } from '@react-three/postprocessing'
import { useStore, RENDER_MODES, THEMES_LIST } from './store'
import type { RenderMode, Theme } from './store'
import { buildLevaSyncPayload } from './levaSync'
import { Scene } from './Scene'
import OnboardingOverlay from './OnboardingOverlay'
import { SessionHud } from './SessionHud'
import { useControls, folder, Leva, monitor } from 'leva'
import { getTheme, PHASE_COLORS, PHASE_LABELS } from './theme'
import { BLEED_SKEW_FLAT, BLEED_SKEW_VOLUMETRIC } from './bleedSkew'
import { useWebcam } from './hooks'
import { useAudio, ensureAudioContext } from './audio'
import { useUnifiedSampler } from './useUnifiedSampler'
import { useThermalGuard, useAdaptiveResolution } from './useThermalGuard'
import { useGestureTracking } from './vision/useGestureTracking'
import { useGestureControls } from './useGestureControls'
import { wristPositionToZoneEnergy } from './vision/wrist-mapping'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { Mood } from './types'
import styles from './threshold.module.css'

if (typeof window !== 'undefined') {
  ;(window as any).__threshold = { useStore }
}

const POS_FLAT = new THREE.Vector3(0, 0, 22)
const POS_VOLUMETRIC = new THREE.Vector3(18, -18, 24)
const LOOK_AT = new THREE.Vector3(0, 0, 0)
const SPACING = 0.25
const FOV = 50

/** Camera distance required for a grid of `resolution` cells (each SPACING
 *  wide) to exactly fill the viewport vertically. The base positions
 *  (POS_FLAT / POS_VOLUMETRIC) are scaled uniformly from the origin so the
 *  viewing angle stays the same at every resolution. */
function cameraDistanceForResolution(resolution: number): number {
  const gridSize = resolution * SPACING
  return gridSize / (2 * Math.tan((FOV * Math.PI / 180) / 2))
}

/** Per-gesture reticle pulse swatch colors (mirrors the onboarding swatches):
 *  fist → green, open_palm → cyan, pinch → orange, thumb_up → yellow, thumb_down → magenta. */
const GESTURE_RETICLE_COLORS: Record<string, string> = {
  fist: '#00ff41',
  open_palm: '#00ffff',
  pinch: '#ff4400',
  thumb_up: '#ffff00',
  thumb_down: '#ff00ff',
}

function AnimatedCamera() {
  const viewMode = useStore(state => state.viewMode)
  const resolution = useStore(state => state.resolution)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  // Cache the distance so the per-frame useFrame loop doesn't recompute
  // the Math.tan-based formula every 16ms — only when resolution changes.
  const targetDist = useMemo(() => cameraDistanceForResolution(resolution), [resolution])

  useFrame((_, delta) => {
    if (!cameraRef.current) return
    const basePos = viewMode === 'flat' ? POS_FLAT : POS_VOLUMETRIC
    // Scale the base position so the camera's Z-component (its perpendicular
    // distance to the grid plane at z=0) matches the distance needed for the
    // grid to exactly fill the viewport. The viewing angle is preserved.
    const baseZ = Math.abs(basePos.z)
    const scale = baseZ > 0 ? targetDist / baseZ : 1
    const targetPos = basePos.clone().multiplyScalar(scale)
    const factor = 1 - Math.pow(0.01, delta)
    cameraRef.current.position.lerp(targetPos, factor)
    cameraRef.current.lookAt(LOOK_AT)
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={FOV} />
}

// Existing warm pointLight with a slow positional drift (±0.5 units, ~0.1Hz).
// Lights are JSX props so the position can't be cheaply animated declarively;
// we mutate the light via ref in a dedicated useFrame instead.
function DriftingPointLight({ basePosition, ...props }: { basePosition: [number, number, number] } & Record<string, any>) {
  const ref = useRef<THREE.PointLight>(null)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const f = 0.1
    ref.current.position.set(
      basePosition[0] + Math.sin(t * f) * 0.5,
      basePosition[1] + Math.cos(t * f * 0.9) * 0.5,
      basePosition[2] + Math.sin(t * f * 0.7) * 0.5,
    )
  })
  return <pointLight ref={ref} position={basePosition} {...props} />
}

function SessionTimer() {
  const [elapsed, setElapsed] = useState(0)
  const initialized = useStore(state => state.initialized)

  useEffect(() => {
    if (!initialized) return
    const interval = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [initialized])

  return (
    <div className={`${styles.hudCaption} opacity-30`}>
      {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
    </div>
  )
}

export default function ThresholdView() {
  const { 
    initialized, setInitialized,
    resolution, setResolution,
    threshold, setThreshold,
    extrusion, setExtrusion,
    inverse, setInverse,
    theme, setTheme,
    renderMode, setRenderMode,
    viewMode, setViewMode,
    sourceMode, setSourceMode,
    showGrid, setShowGrid,
    audioEnabled, setAudioEnabled,
    audioReactive, setAudioReactive,
    volume, setVolume,
    ditherIntensity, setDitherIntensity,
    moodEnabled, setMoodEnabled,
    currentMood, setCurrentMood,
    sessionEnergy, currentPhase,
    zoneEnergy,
    handTracking,
    gestureTrackingStatus,
    gestureGlitchActive,
    setGestureGlitchActive,
     soundTexture, setSoundTexture,
      thermalRisk, setThermalRisk,
      autoDowngradeEnabled, setAutoDowngradeEnabled,
      reducedQuality, setReducedQuality,
      measuredFrameMs,
    } = useStore()

  const palette = getTheme(theme)

  const [canvasReady, setCanvasReady] = useState(false)
  useEffect(() => {
    if (initialized) {
      const raf = requestAnimationFrame(() => setCanvasReady(true))
      return () => cancelAnimationFrame(raf)
    }
  }, [initialized])

  useEffect(() => {
    const handleVisibilityChange = () => {
      useStore.getState().setIsVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Leva brutalist theme — memoized on `palette` (a stable THEMES singleton
  // reference, so this only re-builds when the actual theme changes) so Leva
  // doesn't re-apply theming on every unrelated store-driven re-render.
  const levaTheme = useMemo(() => ({
    colors: {
      elevation1: palette.background,
      elevation2: palette.background,
      elevation3: palette.background,
      accent1: palette.accent,
      accent2: palette.accent,
      accent3: palette.accent,
      highlight1: palette.accent,
      highlight2: palette.accent,
      highlight3: palette.accent,
      folderWidgetColor: palette.accent,
      folderTextColor: palette.accent,
      vivid1: palette.accent,
      toolTipBackground: palette.background,
      toolTipText: palette.accent,
    },
    radii: { xs: '0px', sm: '0px', lg: '0px' },
    fontSizes: { root: '11px' },
    borderWidths: { root: '1px', input: '1px', focus: '1px', hover: '1px', active: '1px', folder: '1px' },
  }), [palette])

  const { videoRef } = useWebcam()
  const { dataRef, frameTextureRef, statusText } = useUnifiedSampler()
  const { analyzerRef, triggerVoice, triggerClick } = useAudio()
  const { status: gestureStatus } = useGestureTracking()
  useGestureControls()

  // Thermal Guard — reads device memory/concurrency + estimates GPU frame cost.
  // Pass the actual active instance-mesh count (1 — only the renderMode mesh is
  // mounted) and the post-process pass count from the tier below so the
  // estimate reflects the optimized configuration.
  // Hysteresis: track last tier change to prevent oscillation.
  // Once tier drops, require 2s dwell time before allowing upgrade.
  const [ppTier, setPpTier] = useState<'high' | 'medium' | 'low'>('high')
  const lastTierChangeRef = useRef<number>(Date.now())
  const DWELL_TIME_MS = 2000

  useEffect(() => {
    const now = Date.now()
    const timeSinceLastChange = now - lastTierChangeRef.current

    let targetTier: 'high' | 'medium' | 'low'
    if (reducedQuality) targetTier = 'low'
    else if (thermalRisk === 'high') targetTier = 'low'
    else if (thermalRisk === 'medium') targetTier = 'medium'
    else targetTier = 'high'

    // Only allow tier upgrade if dwell time has passed (prevents oscillation)
    if (targetTier !== ppTier) {
      const tierRank = { low: 0, medium: 1, high: 2 }
      const isUpgrade = tierRank[targetTier] > tierRank[ppTier]

      if (!isUpgrade || timeSinceLastChange >= DWELL_TIME_MS) {
        setPpTier(targetTier)
        lastTierChangeRef.current = now
      }
    }
  }, [thermalRisk, reducedQuality, ppTier])

  const ppPassCount = useMemo(() => {
    switch (ppTier) {
      case 'high': return 8
      case 'medium': return 4
      case 'low': return 3
      default: return 8
    }
  }, [ppTier])

  const { thermalRisk: detectedRisk, estimatedFrameMs, deviceMemoryGB } = useThermalGuard({
    instanceMeshCount: 1,
    postProcessCount: ppPassCount,
    rAFLoopCount: 1, // Only 1 rAF loop after Track B consolidation
  })

  // Adaptive resolution: auto-downscale resolution when thermal risk is sustained high
  const { resolutionTier, effectiveResolution } = useAdaptiveResolution(resolution, detectedRisk)

  // Sync detected risk to the store so other consumers can react.
  useEffect(() => {
    setThermalRisk(detectedRisk)
  }, [detectedRisk, setThermalRisk])

  // Auto-downgrade: when thermal risk is high and auto-downgrade is enabled,
  // flip reducedQuality on (wired by Track C to post-process tiering + mesh mounting).
  useEffect(() => {
    if (autoDowngradeEnabled && detectedRisk === 'high' && !reducedQuality) {
      setReducedQuality(true)
      console.warn('[ThermalGuard] high thermal risk — auto-downgrading quality')
    }
  }, [detectedRisk, autoDowngradeEnabled, reducedQuality, setReducedQuality])

  // rAF throttle: drop to 30fps target when thermal risk is high or document hidden.
  const { setFrameSkip } = useStore()
  useEffect(() => {
    const targetSkip = (detectedRisk === 'high' || document.hidden) ? 2 : 1
    setFrameSkip(targetSkip)
  }, [detectedRisk, document.hidden, setFrameSkip])

  const thermalColor =
    detectedRisk === 'high' ? '#ff4400'
    : detectedRisk === 'medium' ? '#ffcc00'
    : '#00ff41'

  // Ambient edge-panel glow: while gesture tracking is active and a hand is
  // being tracked, derive the legacy 3-zone [left, center, right] shape from
  // wrist position instead of the pixel-diff `zoneEnergy` the store still
  // holds (that value is frozen/fallback-only once `useMotionZones` demotes
  // itself - see hooks.ts). Falls back to the store's `zoneEnergy` (driven by
  // `useMotionZones`) whenever gesture tracking isn't active.
  const displayZoneEnergy = useMemo(() => {
    if (gestureStatus === 'active') {
      return wristPositionToZoneEnergy(handTracking.wrist, handTracking.detected)
    }
    return zoneEnergy
  }, [gestureStatus, handTracking.wrist, handTracking.detected, zoneEnergy])

  // Live pinch-distance control: once a hand has been seen at least once
  // while gesture tracking is active, pinchDistance becomes the primary
  // control for `threshold` (the Leva slider remains a manual fallback/debug
  // override the rest of the time, and can still be dragged - it'll just get
  // overridden on the next tracked frame).
  const hasDetectedHandRef = useRef(false)
  useEffect(() => {
    if (handTracking.detected) hasDetectedHandRef.current = true
  }, [handTracking.detected])

  useEffect(() => {
    if (gestureStatus === 'active' && hasDetectedHandRef.current) {
      setThreshold(handTracking.pinchDistance)
    }
  }, [gestureStatus, handTracking.pinchDistance, setThreshold])

  // Status label + confidence, separated so the signal-strength bar can drive
  // its segments from the numeric value while the label renders as text.
  const statusInfo = useMemo(() => {
    if (gestureStatus === 'active') {
      if (handTracking.detected) {
        return {
          label: `HAND${handTracking.gesture ? ` ${handTracking.gesture.toUpperCase()}` : ''}`,
          confidence: handTracking.confidence,
        }
      }
      return { label: 'no hand detected', confidence: null as number | null }
    }
    if (gestureStatus === 'failed') {
      return { label: `${statusText} (gesture tracking unavailable)`, confidence: null as number | null }
    }
    return { label: statusText, confidence: null as number | null }
  }, [gestureStatus, handTracking.detected, handTracking.gesture, handTracking.confidence, statusText])

  const [reticlePulseColor, setReticlePulseColor] = useState<string | null>(null)
  const glitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reticleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // VHS glitch + reticle pulse: fire on each handTracking.gesture edge. The
  // store's `gesture` field is one-shot (non-null only on the frame a gesture
  // is entered), so this early-returns on the null transition — letting the
  // ref-held timeout survive and hold the flag for its full duration.
  //   - setGestureGlitchActive(true) for ~200ms → read by Track E1's Glitch
  //     post-fx AND toggles the .glitchActive text effect on the status bar.
  //   - reticlePulseColor set to the per-gesture swatch for ~450ms.
  useEffect(() => {
    if (!handTracking.gesture) return
    setGestureGlitchActive(true)
    setReticlePulseColor(GESTURE_RETICLE_COLORS[handTracking.gesture] ?? palette.accent)
    if (glitchTimeoutRef.current) clearTimeout(glitchTimeoutRef.current)
    if (reticleTimeoutRef.current) clearTimeout(reticleTimeoutRef.current)
    glitchTimeoutRef.current = setTimeout(() => {
      setGestureGlitchActive(false)
      glitchTimeoutRef.current = null
    }, 200)
    reticleTimeoutRef.current = setTimeout(() => {
      setReticlePulseColor(null)
      reticleTimeoutRef.current = null
    }, 450)
  }, [handTracking.gesture, setGestureGlitchActive, palette.accent])

  useEffect(() => () => {
    if (glitchTimeoutRef.current) clearTimeout(glitchTimeoutRef.current)
    if (reticleTimeoutRef.current) clearTimeout(reticleTimeoutRef.current)
  }, [])

  const showReticle = gestureStatus === 'active' && handTracking.detected && !!handTracking.wrist

  const [ppBloom, setPpBloom] = useState({ threshold: 0.5, intensity: 0.3, levels: 6 })
  const [ppChromatic, setPpChromatic] = useState(new THREE.Vector2(0.0005, 0.0005))
  const [ppNoise, setPpNoise] = useState(0.01)
  const [ppScanline, setPpScanline] = useState(0.05)
  const [ppVignette, setPpVignette] = useState(0.8)
  const [showOnboarding, setShowOnboarding] = useState(false)
  type CameraView = 'pip' | 'bleed'
  const [cameraView, setCameraView] = useState<CameraView>('bleed')
  const [cameraOn, setCameraOn] = useState(true)
  const [cameraOpacity, setCameraOpacity] = useState(0.3)

  useEffect(() => {
    if (initialized && !localStorage.getItem('threshold_onboarding_done')) {
      const timer = setTimeout(() => setShowOnboarding(true), 500)
      return () => clearTimeout(timer)
    }
  }, [initialized])

  const dismissOnboarding = () => {
    setShowOnboarding(false)
    localStorage.setItem('threshold_onboarding_done', 'true')
  }

  // sessionEnergy is already quantized by useUnifiedSampler; read directly.
  const quantizedEnergy = sessionEnergy

  useEffect(() => {
    if (!moodEnabled) {
      setPpBloom({ threshold: 0.5, intensity: 0.3, levels: 6 })
      setPpChromatic(new THREE.Vector2(0.0005, 0.0005))
      setPpNoise(0.01)
      setPpVignette(0.8)
      return
    }
    const e = quantizedEnergy / 100  // 0–1
    switch (currentPhase) {
      case 'calm':
        setPpBloom({ threshold: 0.4, intensity: 0.6, levels: 6 })
        setPpChromatic(new THREE.Vector2(0.001, 0.001))
        setPpNoise(0.02)
        setPpVignette(0.85)
        break
      case 'active':
        setPpBloom({ threshold: 0.3, intensity: 1.2 + e * 0.8, levels: 7 })
        setPpChromatic(new THREE.Vector2(0.002 + e * 0.002, 0.002 + e * 0.002))
        setPpNoise(0.05)
        setPpVignette(0.7)
        break
      case 'climax':
        setPpBloom({ threshold: 0.2, intensity: 2.5 + e * 2.0, levels: 8 })
        setPpChromatic(new THREE.Vector2(0.005 + e * 0.003, 0.005 + e * 0.003))
        setPpNoise(0.1)
        setPpVignette(0.55)
        break
    }
  }, [moodEnabled, currentPhase, quantizedEnergy])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const modeList = RENDER_MODES
      if (e.code === 'Space') {
        e.preventDefault()
        const current = useStore.getState().viewMode
        setViewMode(current === 'flat' ? 'volumetric' : 'flat')
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1
        if (idx < modeList.length) setRenderMode(modeList[idx])
      } else if (e.key === 'a' || e.key === 'A') {
        setMoodEnabled(!useStore.getState().moodEnabled)
      } else if (e.key === 'm' || e.key === 'M') {
        const moods: Mood[] = ['luminous', 'deep', 'pulse', 'solar', 'azure']
        const current = useStore.getState().currentMood
        const nextIdx = (moods.indexOf(current) + 1) % moods.length
        setCurrentMood(moods[nextIdx])
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [setViewMode, setRenderMode, setMoodEnabled, setCurrentMood])

  useControls('Signal', {
    source: folder({
      mode: { value: sourceMode, options: { 'CAMERA': 'pixel', 'DEMO': 'demo' }, onChange: setSourceMode },
      resolution: { value: resolution, min: 16, max: 128, step: 1, onChange: setResolution },
    }),
    processing: folder({
      inverse: { value: inverse, onChange: setInverse },
    })
  })

  const [, setVisualsControls] = useControls('Visuals', () => ({
    params: folder({
      threshold: { value: threshold, min: 0, max: 1, step: 0.01, onChange: setThreshold },
      extrusion: { value: extrusion, min: 0, max: 20, step: 0.1, onChange: setExtrusion },
      dithering: { value: ditherIntensity, min: 0, max: 1, step: 0.01, onChange: setDitherIntensity },
    }),
    render: folder({
      mode: { value: renderMode, options: [...RENDER_MODES], onChange: setRenderMode },
      theme: {
        value: theme,
        options: [...THEMES_LIST],
        onChange: setTheme,
        render: () => !moodEnabled,
      },
      mood: { label: 'session arc', value: moodEnabled, onChange: setMoodEnabled },
    })
  }))

  useEffect(() => {
    ;(setVisualsControls as (p: { mode: RenderMode; theme: Theme; mood: boolean }) => void)(
      buildLevaSyncPayload(renderMode, theme, moodEnabled),
    )
  }, [renderMode, theme, moodEnabled, setVisualsControls])

  useControls('View', {
    display: folder({
      mode: { value: viewMode, options: ['flat', 'volumetric'], onChange: setViewMode },
      grid: { value: showGrid, onChange: setShowGrid },
    }),
    camera: folder({
      view: { value: cameraView, options: { 'PIP — corner thumbnail': 'pip', 'BLEED — full background': 'bleed' }, onChange: setCameraView },
      on: { value: cameraOn, onChange: setCameraOn },
      opacity: {
        value: cameraOpacity,
        min: 0,
        max: 1,
        step: 0.05,
        onChange: setCameraOpacity,
        render: () => cameraOn && cameraView === 'bleed',
      },
    })
  })

  useControls('Audio', {
    main: folder({
      enabled: {
        value: audioEnabled,
        onChange: (val: boolean) => {
          if (val) { void ensureAudioContext() }
          setAudioEnabled(val)
        }
      },
      reactive: { value: audioReactive, onChange: setAudioReactive },
    }),
    settings: folder({
      volume: { value: volume, min: 0, max: 100, step: 1, onChange: setVolume },
    }),
    texture: folder({
      soundscape: { value: soundTexture, options: { 'OFF': 'off', 'AMBIENT — atmospheric pad': 'ambient', 'BLOOM — bells/pads': 'bloom', 'BLOOM2 — bells + chimes': 'bloom2', 'GLITCH — noise/fx': 'glitch', 'GLITCH2 — bit-crushed + freeze': 'glitch2', 'PULSE — sub-kick + arp': 'pulse', 'BASS — drone/kick': 'bass' }, onChange: setSoundTexture },
    }),
  })

  // Read-only monitor: reflects the last fired one-shot gesture + the worker
  // status. No `onChange` — it never mutates store state.
  useControls('Gesture', {
    'hand tracking': monitor(() => {
      const gestureLabel = handTracking.gesture
        ? {
            fist: 'FIST — toggle flat/volumetric',
            open_palm: 'OPEN PALM — toggle ARC',
            pinch: 'PINCH — threshold',
            thumb_up: 'THUMB UP — next render mode',
            thumb_down: 'THUMB DOWN — prev render mode',
          }[handTracking.gesture]
        : 'no hand detected'
      const statusLabel = { idle: 'not started', loading: 'starting camera…', active: 'tracking', failed: 'camera unavailable' }[gestureTrackingStatus]
      return `${gestureLabel} · proximity ${handTracking.proximity.toFixed(2)} (${statusLabel})`
    }),
  })

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full font-mono p-10 relative" style={{ background: palette.background, color: palette.accent }}>
        <div className={`${styles.bracket} ${styles.bracketTL}`} style={{ '--bracket-color': palette.accentDim } as CSSProperties} />
        <div className={`${styles.bracket} ${styles.bracketTR}`} style={{ '--bracket-color': palette.accentDim } as CSSProperties} />
        <div className={`${styles.bracket} ${styles.bracketBL}`} style={{ '--bracket-color': palette.accentDim } as CSSProperties} />
        <div className={`${styles.bracket} ${styles.bracketBR}`} style={{ '--bracket-color': palette.accentDim } as CSSProperties} />
        <div className="border p-10 text-center max-w-md" style={{ borderColor: palette.accent }}>
          <h1 className={`${styles.hudDisplay} mb-4`}>THRESHOLD V6</h1>
          <p className={`${styles.hudCaption} opacity-50 mb-8 leading-relaxed`}>
            VOLUMETRIC TERMINAL INSTRUMENT<br />
            MOVEMENT → EXPERIENCE
          </p>
          
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className={`${styles.hudCaption} opacity-60`}>FREE</span>
            <button
              onClick={() => setMoodEnabled(!moodEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                moodEnabled ? '' : 'bg-[#333]'
              }`}
              style={moodEnabled ? { background: palette.accent } : undefined}
            >
              <div className={`w-5 h-5 rounded-full transition-transform ${
                moodEnabled ? 'translate-x-[26px]' : 'translate-x-[2px]'
              }`} style={{ background: palette.background }} />
            </button>
            <span className={`${styles.hudCaption} opacity-60`}>ARC</span>
          </div>
          
          {moodEnabled && (
            <div className="flex gap-2 mb-6">
              {(['luminous', 'deep', 'pulse', 'solar', 'azure'] as const).map(m => {
                const configs: Record<string, { label: string; color: string; emoji: string }> = {
                  luminous: { label: 'LUMINOUS', color: '#00ff41', emoji: '🌿' },
                  deep: { label: 'DEEP', color: '#ff00ff', emoji: '🔮' },
                  pulse: { label: 'PULSE', color: '#ff4400', emoji: '🔥' },
                  solar: { label: 'SOLAR', color: '#ffcc00', emoji: '☀️' },
                  azure: { label: 'AZURE', color: '#00ccff', emoji: '🌊' },
                }
                const c = configs[m]
                return (
                  <button
                    key={m}
                    onClick={() => setCurrentMood(m)}
                    className={`px-3 py-2 ${styles.hudMicro} transition-all ${
                      currentMood === m ? '' : 'opacity-50'
                    }`}
                    style={{
                      border: `1px solid ${c.color}`,
                      color: currentMood === m ? palette.background : c.color,
                      background: currentMood === m ? c.color : 'transparent',
                    }}
                  >
                    {c.emoji} {c.label}
                  </button>
                )
              })}
            </div>
          )}

          <button 
            onClick={() => setInitialized(true)}
            className={`px-10 py-3 ${styles.hudLabel} hover:scale-105 transition-transform`}
            style={{ background: palette.accent, color: palette.background }}
          >
            INITIALIZE
          </button>
        </div>
      </div>
    )
  }

  if (showOnboarding) {
    // Mount the (hidden) webcam element here too so camera permission +
    // gesture tracking activate during the walkthrough — step 3 needs the
    // live `handTracking` signal to light up the practice swatches. The
    // heavy 3D Canvas stays unmounted until onboarding is dismissed.
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ background: palette.background }}>
        <video ref={videoRef} autoPlay playsInline muted className="fixed opacity-0 pointer-events-none" />
        <OnboardingOverlay palette={palette} onDismiss={dismissOnboarding} />
      </div>
    )
  }


  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: palette.background }}>
      {gestureStatus === 'failed' && (
        <div className="absolute top-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className={`mt-4 px-4 py-2 border-2 border-[#ff4400] text-[#ff4400] ${styles.hudCaption} text-center max-w-md`} style={{ background: `${palette.background}f2`, textTransform: 'none' }}>
            GESTURE TRACKING UNAVAILABLE — hand-model failed to load (likely a blocked network request). Falling back to basic motion detection; fist/palm/pinch gestures won&apos;t register.
          </div>
        </div>
      )}
      <video ref={videoRef} autoPlay playsInline muted className="fixed opacity-0 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className={`${styles.bracket} ${styles.bracketTL}`} style={{ '--bracket-color': palette.accentDim } as CSSProperties} />
        <div className={`${styles.bracket} ${styles.bracketTR}`} style={{ '--bracket-color': palette.accentDim } as CSSProperties} />
        <div className={`${styles.bracket} ${styles.bracketBL}`} style={{ '--bracket-color': palette.accentDim } as CSSProperties} />
        <div className={`${styles.bracket} ${styles.bracketBR}`} style={{ '--bracket-color': palette.accentDim } as CSSProperties} />

        {/* Targeting reticle — tracks handTracking.wrist (normalized 0-1 image
            space, x mirrored to match the self-view webcam). Pulses through the
            per-gesture swatch color on each gesture edge. */}
        {showReticle && handTracking.wrist && (
          <div
            className={styles.reticle}
            style={{
              left: `${(1 - handTracking.wrist.x) * 100}%`,
              top: `${handTracking.wrist.y * 100}%`,
              '--reticle-color': reticlePulseColor ?? palette.accent,
            } as CSSProperties}
          >
            <div className={`${styles.reticleRing} ${reticlePulseColor ? styles.reticlePulsing : ''}`} />
            <div className={styles.reticleCrossH} />
            <div className={styles.reticleCrossV} />
          </div>
        )}

        <SessionHud
          renderMode={renderMode}
          theme={theme}
          moodEnabled={moodEnabled}
          currentMood={currentMood}
          soundTexture={soundTexture}
        />
      </div>

      {/* Ambient Edge Panels */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300"
          style={{
            background: `linear-gradient(to bottom, #ff00ff00, #ff00ff${Math.round(displayZoneEnergy[0] * 40).toString(16).padStart(2, '0')}, #ff00ff00)`,
            opacity: 0.6,
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-300"
          style={{
            background: `linear-gradient(to right, #00ffff00, #00ffff${Math.round(displayZoneEnergy[1] * 60).toString(16).padStart(2, '0')}, #00ffff00)`,
            opacity: 0.5,
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px] transition-all duration-300"
          style={{
            background: `linear-gradient(to right, #ff440000, #ff4400${Math.round(displayZoneEnergy[2] * 50).toString(16).padStart(2, '0')}, #ff440000)`,
            opacity: 0.5,
          }}
        />
      </div>

      {/* Webcam overlay (pip | bleed; off when !cameraOn) */}
      {/* 3D stage: shared square (1:1) container that holds the bleed video
          and the Canvas. Both fill the same box at the same pixel size, so
          the 3D grid aligns pixel-for-pixel with the visible camera feed.
          Centered and sized to the largest square that fits the viewport. */}
      <div
        className="absolute z-0"
        style={{
          aspectRatio: '1 / 1',
          maxWidth: '100vw',
          maxHeight: '100vh',
          width: 'min(100vw, 100vh)',
          height: 'min(100vw, 100vh)',
          left: '50%',
          top: '50%',
          transform: viewMode === 'volumetric' ? BLEED_SKEW_VOLUMETRIC : BLEED_SKEW_FLAT,
          transition: 'transform 900ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {cameraOn && cameraView === 'bleed' && (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ opacity: cameraOpacity }}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `rgba(0,0,0,${1 - cameraOpacity})` }}
            />
          </>
        )}
      </div>
      {cameraOn && cameraView === 'pip' && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute top-8 right-8 z-20 w-[200px] h-[150px] object-cover rounded border border-white/20"
        />
      )}

      {/* Status bar */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div
          className={`${styles.hudCaption} ${gestureGlitchActive ? styles.glitchActive : ''} opacity-30`}
          style={{ color: palette.accent }}
          title={statusInfo.confidence != null ? `${Math.round(statusInfo.confidence * 100)}%` : undefined}
        >
          <span>{statusInfo.label}</span>
          {statusInfo.confidence != null && (
            <span className={styles.signalBar} aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={styles.signalSeg}
                  style={{ background: i < Math.ceil(statusInfo.confidence * 5) ? palette.accent : palette.accentDim }}
                />
              ))}
            </span>
          )}
        </div>
      </div>

      {/* Depth meter + Timer (bottom-left) */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-none flex items-end gap-3">
        <div className="flex flex-col items-center gap-1">
          <div className="w-[3px] h-20 bg-[#1a1a1a] rounded-full relative">
            <div 
              className={`absolute bottom-0 w-full rounded-full transition-all duration-500 ${styles.neonGlow}`}
              style={{
                height: `${sessionEnergy}%`,
                background: PHASE_COLORS[currentPhase],
                color: PHASE_COLORS[currentPhase],
                opacity: moodEnabled ? 1 : 0.15,
              }}
            />
          </div>
          <span
            className={`${styles.hudMicro} whitespace-nowrap`}
            style={{
              color: PHASE_COLORS[currentPhase],
              opacity: moodEnabled ? 1 : 0.15,
            }}
          >
            {moodEnabled ? PHASE_LABELS[currentPhase] : 'ARC OFF'}
          </span>
        </div>
        <SessionTimer />
      </div>

      {/* Mood toggle HUD button (bottom-right) */}
      <div className="absolute bottom-6 right-6 z-20">
        <button
          onClick={() => setMoodEnabled(!moodEnabled)}
          className={`${styles.hudMicro} ${styles.neonGlow} px-3 py-1 transition-all pointer-events-auto`}
          style={{
            border: `1px solid ${moodEnabled ? palette.accent : '#333'}`,
            color: moodEnabled ? palette.accent : '#555',
            background: moodEnabled ? `${palette.accent}11` : 'transparent',
          }}
        >
          {moodEnabled ? 'ARC' : 'ARC OFF'}
        </button>
      </div>

      {/* Persistent onboarding replay (?) — reopens the walkthrough anytime. */}
      <div className="absolute bottom-6 right-20 z-20">
        <button
          onClick={() => setShowOnboarding(true)}
          aria-label="Replay onboarding walkthrough"
          title="Replay onboarding"
          className="hud-replay text-[10px] tracking-[0.1em] w-7 h-7 flex items-center justify-center transition-opacity hover:opacity-100 pointer-events-auto"
          style={{ border: `1px solid ${palette.accent}`, color: palette.accent, opacity: 0.4 }}
        >
          ?
        </button>
      </div>

      {/* Thermal Guard HUD (top-left) */}
      <div className="absolute top-8 left-8 z-20 pointer-events-auto flex items-center gap-3">
        <span
          className={styles.hudThermal}
          style={{ '--thermal-color': thermalColor } as CSSProperties}
        >
          THERMAL // {detectedRisk.toUpperCase()}
        </span>
        <span className={`${styles.hudMicro} opacity-50 whitespace-nowrap`}>
          est {estimatedFrameMs.toFixed(1)}ms
          {measuredFrameMs > 0 && ` · meas ${measuredFrameMs.toFixed(1)}ms`}
          {deviceMemoryGB !== null && ` · ${deviceMemoryGB}GB`}
        </span>
        <button
          onClick={() => setAutoDowngradeEnabled(!autoDowngradeEnabled)}
          className={`${styles.hudMicro} px-2 py-1 border transition-all pointer-events-auto`}
          style={{
            borderColor: autoDowngradeEnabled ? '#00ff41' : '#555',
            color: autoDowngradeEnabled ? '#00ff41' : '#555',
            background: autoDowngradeEnabled ? 'rgba(0,255,65,0.05)' : 'transparent',
          }}
          title="Thermal auto-downgrade (toggle for manual override)"
        >
          {autoDowngradeEnabled ? 'AUTO' : 'MANUAL'}
        </button>
        {resolutionTier < 1.0 && (
          <span className={`${styles.hudMicro} text-[#ffcc00]`}>
            RES ×{resolutionTier}
          </span>
        )}
      </div>

      {/* Camera controls: PIP | BLEED view selectors + OFF kill switch */}
      <div className="absolute top-8 right-8 z-20 flex gap-2 items-center pointer-events-auto">
        {(['pip', 'bleed'] as const).map((v) => (
          <button
            key={v}
            onClick={() => { setCameraView(v); setCameraOn(true) }}
            className={`${styles.hudMicro} px-2 py-1 border ${
              cameraOn && cameraView === v
                ? 'border-white text-white bg-white/10'
                : 'border-white/20 text-white/50 hover:text-white hover:border-white/50'
            }`}
          >
            CAM // {v.toUpperCase()}
          </button>
        ))}
        <button
          onClick={() => setCameraOn((v) => !v)}
          aria-label={cameraOn ? 'Hide camera' : 'Show camera'}
          className={`${styles.hudMicro} px-2 py-1 border ${
            !cameraOn
              ? 'border-[#ff4400] text-[#ff4400] bg-[#ff4400]/10'
              : 'border-white/20 text-white/70 hover:text-white hover:border-white/50'
          }`}
        >
          CAM // {cameraOn ? 'ON' : 'OFF'}
        </button>
      </div>

      <Leva
        titleBar={{ title: 'THRESHOLD' }}
        flat
        theme={levaTheme}
      />
      {/* Canvas wrapper: matches the square bleed stage so the 3D grid
          renders at the exact same pixel size as the camera feed.
          Guarded by `canvasReady` so React StrictMode's double-mount in
          dev can't create/unmount the WebGL renderer twice in rapid
          succession (which can surface as a transient context-lost). */}
      {canvasReady && (
      <div
        className="absolute z-[1]"
        style={{
          aspectRatio: '1 / 1',
          maxWidth: '100vw',
          maxHeight: '100vh',
          width: 'min(100vw, 100vh)',
          height: 'min(100vw, 100vh)',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
      <Canvas shadows gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
        gl.setClearAlpha(0)
        gl.domElement.style.touchAction = 'auto'
        gl.domElement.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false })

        const canvas = gl.domElement
        canvas.addEventListener('webglcontextlost', (event) => {
          event.preventDefault()
          console.warn('[Threshold] WebGL context lost — attempting recovery')
        })
        canvas.addEventListener('webglcontextrestored', () => {
          console.info('[Threshold] WebGL context restored')
        })
      }}>
        <AnimatedCamera />
        {/* No background color - transparent Canvas allows camera bleed to show through */}
        <EffectComposer>
          <Bloom luminanceThreshold={ppBloom.threshold} intensity={ppBloom.intensity} levels={Math.min(ppBloom.levels, 6)} mipmapBlur />
          <HueSaturation hue={0} saturation={0.15} />
          {ppTier !== 'low' && (
            <ChromaticAberration offset={ppChromatic} />
          )}
          {/* focusDistance constant 0.02 (camera-lerp target isn't exposed to
              the composer; 0.02 keeps the near volumetric field sharp and lets
              the far edge bloom into bokeh). bokehScale ~2.5.
              Only mounts at high tier + volumetric view. */}
          {ppTier === 'high' && viewMode === 'volumetric' && (
            <DepthOfField focusDistance={0.02} bokehScale={2.5} />
          )}
          {/* Glitch only at high tier — deactivated when reducedQuality or
              thermal risk is high (Glitch is omitted entirely, not just
              active={false}). */}
          {ppTier === 'high' && (
            <Glitch active={gestureGlitchActive} delay={new THREE.Vector2(1e9, 2e9)} duration={new THREE.Vector2(0.15, 0.25)} strength={new THREE.Vector2(0.15, 0.25)} />
          )}
          <Scanline opacity={ppScanline} density={2} />
          {ppTier === 'high' && (
            <Noise opacity={ppNoise} />
          )}
          {ppTier === 'high' && (
            <Vignette eskil={false} offset={0.1} darkness={ppVignette} />
          )}
        </EffectComposer>
        <ambientLight intensity={0.2} />
        <DriftingPointLight basePosition={[10, 10, 10]} intensity={1} color={palette.accent} />
        <directionalLight position={[-8, 6, -10]} intensity={0.4} color={palette.accent} />
        <fog attach="fog" args={[palette.background, 15, 45]} />
        <Scene pixelDataRef={dataRef} analyzerRef={analyzerRef} triggerVoice={triggerVoice} triggerClick={triggerClick} frameTextureRef={frameTextureRef} />
      </Canvas>
      </div>
      )}
    </div>
  )
}