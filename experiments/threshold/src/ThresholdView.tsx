'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Bloom, EffectComposer, ChromaticAberration, Scanline, Noise, Vignette } from '@react-three/postprocessing'
import { useStore } from './store'
import { Scene } from './Scene'
import { useControls, folder } from 'leva'
import { useWebcam, useSampler, useMotionZones } from './hooks'
import { useAudio } from './audio'
import { useEnergyAccumulator } from './useEnergyAccumulator'
import { useGestureTracking } from './vision/useGestureTracking'
import { wristPositionToZoneEnergy } from './vision/wrist-mapping'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import * as Tone from 'tone'
import { Mood } from './types'

if (typeof window !== 'undefined') {
  ;(window as any).__threshold = { useStore }
}

const POS_FLAT = new THREE.Vector3(0, 0, 22)
const POS_VOLUMETRIC = new THREE.Vector3(12, -12, 20)
const LOOK_AT = new THREE.Vector3(0, 0, 0)

function AnimatedCamera() {
  const viewMode = useStore(state => state.viewMode)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  useFrame((_, delta) => {
    if (!cameraRef.current) return
    const targetPos = viewMode === 'flat' ? POS_FLAT : POS_VOLUMETRIC
    const factor = 1 - Math.pow(0.01, delta)
    cameraRef.current.position.lerp(targetPos, factor)
    cameraRef.current.lookAt(LOOK_AT)
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={50} />
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
    <div className="text-[9px] font-mono tracking-[0.2em] opacity-30">
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
    soundTexture, setSoundTexture,
  } = useStore()

  const { videoRef } = useWebcam()
  const { dataRef } = useSampler()
  const { analyzerRef, triggerVoice, triggerClick } = useAudio()
  const { statusText } = useMotionZones()
  const { status: gestureStatus } = useGestureTracking()
  useEnergyAccumulator()

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

  const displayStatusText = gestureStatus === 'active'
    ? (handTracking.detected
        ? `HAND${handTracking.gesture ? ` ${handTracking.gesture.toUpperCase()}` : ''} ${Math.round(handTracking.confidence * 100)}%`
        : 'no hand detected')
    : gestureStatus === 'failed'
      ? `${statusText} (gesture tracking unavailable)`
      : statusText

  const [ppBloom, setPpBloom] = useState({ threshold: 0.5, intensity: 0.3, levels: 6 })
  const [ppChromatic, setPpChromatic] = useState(new THREE.Vector2(0.0005, 0.0005))
  const [ppNoise, setPpNoise] = useState(0.01)
  const [ppScanline, setPpScanline] = useState(0.05)
  const [ppVignette, setPpVignette] = useState(0.8)
  const [showOnboarding, setShowOnboarding] = useState(false)

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

  const quantizedEnergy = Math.round(sessionEnergy / 5) * 5

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
      const modeList = ['radio', 'dots', 'blocks', 'particles', 'ascii', 'pixel', 'spectral'] as const
      if (e.code === 'Space') {
        e.preventDefault()
        const current = useStore.getState().viewMode
        setViewMode(current === 'flat' ? 'volumetric' : 'flat')
      } else if (e.key >= '1' && e.key <= '7') {
        const idx = parseInt(e.key) - 1
        if (idx < modeList.length) setRenderMode(modeList[idx])
      } else if (e.key === '0') {
        setMoodEnabled(!useStore.getState().moodEnabled)
      } else if (e.key === 'm' || e.key === 'M') {
        const moods: Mood[] = ['luminous', 'deep', 'pulse']
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

  useControls('Visuals', {
    params: folder({
      threshold: { value: threshold, min: 0, max: 1, step: 0.01, onChange: setThreshold },
      extrusion: { value: extrusion, min: 0, max: 20, step: 0.1, onChange: setExtrusion },
      dithering: { value: ditherIntensity, min: 0, max: 1, step: 0.01, onChange: setDitherIntensity },
    }),
    render: folder({
      mode: { value: renderMode, options: ['pixel', 'radio', 'blocks', 'dots', 'particles', 'ascii', 'spectral'], onChange: setRenderMode },
      theme: { value: theme, options: ['dark', 'light', 'acid', 'heatmap'], onChange: setTheme },
      mood: { value: moodEnabled, onChange: setMoodEnabled },
    })
  })

  useControls('View', {
    display: folder({
      mode: { value: viewMode, options: ['flat', 'volumetric'], onChange: setViewMode },
      grid: { value: showGrid, onChange: setShowGrid },
    })
  })

  useControls('Audio', {
    main: folder({
      enabled: {
        value: audioEnabled,
        onChange: (val: boolean) => {
          if (val) { Tone.start().catch(() => {}) }
          setAudioEnabled(val)
        }
      },
      reactive: { value: audioReactive, onChange: setAudioReactive },
    }),
    settings: folder({
      volume: { value: volume, min: 0, max: 100, step: 1, onChange: setVolume },
    }),
    texture: folder({
      soundscape: { value: soundTexture, options: { 'OFF': 'off', 'BLOOM — bells/pads': 'bloom', 'GLITCH — noise/fx': 'glitch', 'BASS — drone/kick': 'bass' }, onChange: setSoundTexture },
    }),
  })

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#050505] text-[#00ff41] font-mono p-10">
        <div className="border border-[#00ff41] p-10 text-center max-w-md">
          <h1 className="text-3xl mb-4 tracking-[0.2em]">THRESHOLD V5</h1>
          <p className="text-xs opacity-50 mb-8 leading-relaxed tracking-widest">
            VOLUMETRIC TERMINAL INSTRUMENT<br />
            MOVEMENT → EXPERIENCE
          </p>
          
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-[10px] tracking-[0.2em] opacity-60">ARC</span>
            <button
              onClick={() => setMoodEnabled(!moodEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                moodEnabled ? 'bg-[#00ff41]' : 'bg-[#333]'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-[#050505] transition-transform ${
                moodEnabled ? 'translate-x-[26px]' : 'translate-x-[2px]'
              }`} />
            </button>
            <span className="text-[10px] tracking-[0.2em] opacity-60">FREE</span>
          </div>
          
          {moodEnabled && (
            <div className="flex gap-2 mb-6">
              {(['luminous', 'deep', 'pulse'] as const).map(m => {
                const configs: Record<string, { label: string; color: string; emoji: string }> = {
                  luminous: { label: 'LUMINOUS', color: '#00ff41', emoji: '🌿' },
                  deep: { label: 'DEEP', color: '#ff00ff', emoji: '🔮' },
                  pulse: { label: 'PULSE', color: '#ff4400', emoji: '🔥' },
                }
                const c = configs[m]
                return (
                  <button
                    key={m}
                    onClick={() => setCurrentMood(m)}
                    className={`px-3 py-2 text-[9px] tracking-[0.2em] transition-all ${
                      currentMood === m ? 'text-[#050505]' : 'opacity-50'
                    }`}
                    style={{
                      border: `1px solid ${c.color}`,
                      color: currentMood === m ? '#050505' : c.color,
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
            className="bg-[#00ff41] text-[#050505] px-10 py-3 text-sm tracking-[0.3em] hover:scale-105 transition-transform"
          >
            INITIALIZE
          </button>
        </div>
      </div>
    )
  }

  if (showOnboarding) {
    return (
      <div 
        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]/95 font-mono cursor-pointer"
        onClick={dismissOnboarding}
      >
        <div className="text-center max-w-lg px-8">
          <div className="mb-8">
            <div className="flex justify-center gap-4 mb-6">
              <div className="w-16 h-24 border border-[#00ff4144] rounded flex items-center justify-center">
                <span className="text-[8px] text-[#00ff41] tracking-[0.2em] animate-pulse">FIST</span>
              </div>
              <div className="w-16 h-24 border border-[#00ffff44] rounded flex items-center justify-center">
                <span className="text-[8px] text-[#00ffff] tracking-[0.2em] animate-pulse">OPEN PALM</span>
              </div>
              <div className="w-16 h-24 border border-[#ff440044] rounded flex items-center justify-center">
                <span className="text-[8px] text-[#ff4400] tracking-[0.2em] animate-pulse">PINCH</span>
              </div>
            </div>
          </div>

          <h2 className="text-lg tracking-[0.3em] mb-2 text-[#00ff41]">SHOW YOUR HAND TO AWAKEN</h2>
          <p className="text-[10px] opacity-50 mb-6 leading-relaxed">
            MOVE HAND → DRIVES HUE, DEPTH &amp; CAMERA
          </p>
          <p className="text-[10px] opacity-50 mb-6 leading-relaxed">
            MAKE A FIST / OPEN PALM / PINCH FINGERS → TRIGGERS A MOMENT<br />
            NO HAND DETECTED → FALLS BACK TO AMBIENT MOTION
          </p>
          <p className="text-[8px] opacity-30 mt-8">
            CLICK ANYWHERE TO START
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-[#050505] relative overflow-hidden">
      {gestureStatus === 'failed' && (
        <div className="absolute top-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="mt-4 px-4 py-2 bg-[#050505]/95 border border-[#ff4400] text-[#ff4400] text-[10px] font-mono tracking-[0.15em] text-center max-w-md">
            GESTURE TRACKING UNAVAILABLE — hand-model failed to load (likely a blocked network request). Falling back to basic motion detection; fist/palm/pinch gestures won&apos;t register.
          </div>
        </div>
      )}
      <video ref={videoRef} autoPlay playsInline muted className="fixed opacity-0 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-8 left-8 border-l border-t border-[#00ff41]/40 w-10 h-10" />
        <div className="absolute top-8 right-8 border-r border-t border-[#00ff41]/40 w-10 h-10" />
        <div className="absolute bottom-8 left-8 border-l border-b border-[#00ff41]/40 w-10 h-10" />
        <div className="absolute bottom-8 right-8 border-r border-b border-[#00ff41]/40 w-10 h-10" />
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

      {/* Webcam PIP */}
      <div className="absolute top-8 right-8 z-20 rounded overflow-hidden border border-white/10 opacity-30 hover:opacity-70 transition-opacity pointer-events-none">
        <video 
          ref={videoRef} 
          autoPlay playsInline muted 
          className="w-32 h-24 object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        <div className="absolute inset-0 flex pointer-events-none">
          <div className="flex-1 border-r border-[#ff00ff22]" />
          <div className="flex-1 border-r border-[#00ffff22]" />
          <div className="flex-1" />
        </div>
      </div>

      {/* Status bar */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="text-[9px] font-mono tracking-[0.2em] opacity-30 text-[#00ff41]">
          {displayStatusText}
        </div>
      </div>

      {/* Depth meter + Timer (bottom-left) */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-none flex items-end gap-3">
        <div className="flex flex-col items-center gap-1">
          <div className="w-[3px] h-20 bg-[#1a1a1a] rounded-full relative overflow-hidden">
            <div 
              className="absolute bottom-0 w-full rounded-full transition-all duration-500"
              style={{
                height: `${sessionEnergy}%`,
                background: currentPhase === 'calm' 
                  ? '#00ff41' 
                  : currentPhase === 'active' 
                    ? '#ffff00' 
                    : '#ff4444',
                opacity: moodEnabled ? 1 : 0.15,
              }}
            />
          </div>
        </div>
        <SessionTimer />
      </div>

      {/* Mood toggle HUD button (bottom-right) */}
      <div className="absolute bottom-6 right-6 z-20">
        <button
          onClick={() => setMoodEnabled(!moodEnabled)}
          className="text-[8px] tracking-[0.2em] px-3 py-1 transition-all pointer-events-auto"
          style={{
            border: `1px solid ${moodEnabled ? '#00ff41' : '#333'}`,
            color: moodEnabled ? '#00ff41' : '#555',
            background: moodEnabled ? '#00ff4111' : 'transparent',
          }}
        >
          {moodEnabled ? 'ARC' : 'ARC OFF'}
        </button>
      </div>

      <Canvas shadows gl={{ antialias: false }} onCreated={({ gl }) => { gl.domElement.style.touchAction = 'auto'; gl.domElement.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false }) }}>
        <AnimatedCamera />
        <color attach="background" args={['#050505']} />
        <EffectComposer>
          <Bloom luminanceThreshold={ppBloom.threshold} intensity={ppBloom.intensity} levels={ppBloom.levels} mipmapBlur />
          <ChromaticAberration offset={ppChromatic} />
          <Scanline opacity={ppScanline} density={2} />
          <Noise opacity={ppNoise} />
          <Vignette eskil={false} offset={0.1} darkness={ppVignette} />
        </EffectComposer>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} color={theme === 'acid' ? '#ccff00' : '#00ff41'} />
        <Scene pixelDataRef={dataRef} analyzerRef={analyzerRef} triggerVoice={triggerVoice} triggerClick={triggerClick} />
      </Canvas>
    </div>
  )
}