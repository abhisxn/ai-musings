'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Bloom, EffectComposer, ChromaticAberration, Scanline, Noise, Vignette } from '@react-three/postprocessing'
import { useStore } from './store'
import { Scene } from './Scene'
import { useControls, folder } from 'leva'
import { useWebcam, useSampler, useMotionZones } from './hooks'
import { useAudio } from './audio'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { AIComposer } from './ai-composer'

if (typeof window !== 'undefined') {
  ;(window as any).__threshold = { useStore, AIComposer }
}

const POS_FLAT = new THREE.Vector3(0, 0, 22)
const POS_VOLUMETRIC = new THREE.Vector3(12, -12, 20)
const LOOK_AT = new THREE.Vector3(0, 0, 0)

const GESTURE_COLORS: Record<string, string> = {
  'jazz-hands': '#ff00ff',
  'peace-sign': '#00ffff',
  'fist-pump': '#ff4400',
}

const GESTURE_LABELS: Record<string, string> = {
  'jazz-hands': 'GLITCH MODE',
  'peace-sign': 'BLOOM MODE',
  'fist-pump': 'BASS MODE',
}

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
    soundType, setSoundType,
    volume, setVolume
  } = useStore()

  const { videoRef } = useWebcam()
  const { loading, dataRef } = useSampler()
  const { analyzerRef, synthRef, clickSynthRef } = useAudio()
  const { statusText } = useMotionZones()
  const { currentGesture, currentMode, hallucinatedControls } = useStore()
  const gestureColor = currentGesture ? GESTURE_COLORS[currentGesture] || '#00ff41' : '#00ff41'
  const gestureLabel = currentGesture ? GESTURE_LABELS[currentGesture] || currentGesture.toUpperCase() : ''
  const [flash, setFlash] = useState(false)

  const { setCurrentMode, setCurrentGesture } = useStore()
  const [ppBloom, setPpBloom] = useState({ threshold: 0.5, intensity: 0.8, levels: 8 })
  const [ppChromatic, setPpChromatic] = useState(new THREE.Vector2(0.001, 0.001))
  const [ppNoise, setPpNoise] = useState(0.03)
  const [ppScanline, setPpScanline] = useState(0.1)
  const [ppVignette, setPpVignette] = useState(1.1)

  useEffect(() => {
    if (!currentGesture) return
    const composer = new AIComposer()
    composer.composeExperience(currentGesture)
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 500)
    return () => clearTimeout(t)
  }, [currentGesture])

  useEffect(() => {
    switch (currentMode) {
      case 'glitch':
        setPpBloom({ threshold: 0.3, intensity: 1.2, levels: 8 })
        setPpChromatic(new THREE.Vector2(0.005, 0.005))
        setPpNoise(0.15)
        setPpScanline(0.25)
        setPpVignette(1.3)
        break
      case 'bloom':
        setPpBloom({ threshold: 0.2, intensity: 2.0, levels: 8 })
        setPpChromatic(new THREE.Vector2(0.001, 0.001))
        setPpNoise(0.01)
        setPpScanline(0.05)
        setPpVignette(0.8)
        break
      case 'bass':
        setPpBloom({ threshold: 0.4, intensity: 1.5, levels: 8 })
        setPpChromatic(new THREE.Vector2(0.002, 0.002))
        setPpNoise(0.05)
        setPpScanline(0.2)
        setPpVignette(1.0)
        break
      default: // IDLE
        setPpBloom({ threshold: 0.5, intensity: 0.8, levels: 8 })
        setPpChromatic(new THREE.Vector2(0.001, 0.001))
        setPpNoise(0.03)
        setPpScanline(0.1)
        setPpVignette(1.1)
    }
  }, [currentMode])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const gestureMap: Record<string, 'jazz-hands' | 'peace-sign' | 'fist-pump'> = { '1': 'jazz-hands', '2': 'peace-sign', '3': 'fist-pump' }
      const modeMap: Record<string, 'glitch' | 'bloom' | 'bass'> = { '1': 'glitch', '2': 'bloom', '3': 'bass' }
      if (e.code === 'Space') {
        e.preventDefault()
        const current = useStore.getState().viewMode
        setViewMode(current === 'flat' ? 'volumetric' : 'flat')
      } else if (gestureMap[e.key]) {
        setCurrentGesture(gestureMap[e.key])
        setCurrentMode(modeMap[e.key] || null)
      } else if (e.key === '0') {
        setCurrentGesture(null)
        setCurrentMode(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [setCurrentGesture, setCurrentMode, setViewMode])

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const delta = e.deltaY * -0.0005
      const currentThresh = useStore.getState().threshold
      const nextThresh = Math.max(0, Math.min(1, currentThresh + delta))
      setThreshold(nextThresh)
    }
    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [setThreshold])

  useControls('Signal', {
    source: folder({
      mode: { value: sourceMode, options: { '2D CAMERA': 'pixel', '3D SCAN (AI)': 'ai' }, onChange: setSourceMode },
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
    }),
    render: folder({
      mode: { value: renderMode, options: ['pixel', 'radio', 'blocks', 'dots', 'particles', 'ascii', 'spectral'], onChange: setRenderMode },
      theme: { value: theme, options: ['dark', 'light', 'acid', 'heatmap'], onChange: setTheme },
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
      enabled: { value: audioEnabled, onChange: setAudioEnabled },
      reactive: { value: audioReactive, onChange: setAudioReactive },
    }),
    settings: folder({
      type: { value: soundType, options: ['sine', 'chimes', 'bells', 'pulse'], onChange: setSoundType },
      volume: { value: volume, min: -60, max: 0, step: 1, onChange: setVolume },
    })
  })

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#050505] text-[#00ff41] font-mono p-10">
        <div className="border border-[#00ff41] p-10 text-center max-w-md">
          <h1 className="text-3xl mb-4 tracking-[0.2em]">THRESHOLD V4</h1>
          <p className="text-xs opacity-50 mb-10 leading-relaxed tracking-widest">
            AI-COMPOSED AUDIOVISUAL INSTRUMENT<br />
            GESTURE → EXPERIENCE PIPELINE
          </p>
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

  return (
    <div className="w-full h-full bg-[#050505] relative overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="fixed opacity-0 pointer-events-none" />
      {loading && (
        <div className="absolute top-4 left-4 z-50 text-[#00ff41] text-[10px] tracking-[0.2em] animate-pulse">
          FETCHING AI MODEL...
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-8 left-8 border-l border-t border-[#00ff41]/40 w-10 h-10" />
        <div className="absolute top-8 right-8 border-r border-t border-[#00ff41]/40 w-10 h-10" />
        <div className="absolute bottom-8 left-8 border-l border-b border-[#00ff41]/40 w-10 h-10" />
        <div className="absolute bottom-8 right-8 border-r border-b border-[#00ff41]/40 w-10 h-10" />
      </div>

      {/* AI Composer HUD — visible feedback when gesture is active */}
      {currentGesture && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-500"
          style={{ opacity: flash ? 1 : 0.7 }}
        >
          <div
            className="text-center font-mono tracking-[0.3em] px-12 py-6 border"
            style={{
              borderColor: gestureColor,
              color: gestureColor,
              boxShadow: `0 0 30px ${gestureColor}44, inset 0 0 30px ${gestureColor}22`,
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}
          >
            <div className="text-lg font-bold animate-pulse">{gestureLabel}</div>
            {hallucinatedControls.length > 0 && (
              <div className="text-[10px] mt-2 opacity-60">
                {hallucinatedControls.map(c => c.label).join(' • ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="text-[9px] font-mono tracking-[0.2em] opacity-30 text-[#00ff41]">
          {statusText}
        </div>
      </div>

      {/* Mode buttons */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-3 pointer-events-auto">
        {[
          { mode: 'glitch' as const, gesture: 'jazz-hands' as const, label: 'GLITCH', color: '#ff00ff' },
          { mode: 'bloom' as const, gesture: 'peace-sign' as const, label: 'BLOOM', color: '#00ffff' },
          { mode: 'bass' as const, gesture: 'fist-pump' as const, label: 'BASS', color: '#ff4400' },
        ].map(({ mode, gesture, label, color }) => (
          <button
            key={mode}
            onClick={() => {
              setCurrentGesture(currentMode === mode ? null : gesture)
              setCurrentMode(currentMode === mode ? null : mode)
            }}
            className="px-5 py-2 text-[10px] font-mono tracking-[0.25em] transition-all duration-300"
            style={{
              border: `1px solid ${color}`,
              color: currentMode === mode ? '#050505' : color,
              background: currentMode === mode ? color : 'transparent',
              opacity: currentMode === mode ? 1 : 0.6,
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => { setCurrentGesture(null); setCurrentMode(null) }}
          className="px-4 py-2 text-[10px] font-mono tracking-[0.25em] transition-all duration-300"
          style={{
            border: '1px dashed #00ff4166',
            color: '#00ff4166',
            background: 'transparent',
          }}
        >
          IDLE
        </button>
      </div>

      <Canvas shadows gl={{ antialias: false }}>
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
        <Scene pixelDataRef={dataRef} analyzerRef={analyzerRef} synthRef={synthRef} clickSynthRef={clickSynthRef} />
      </Canvas>
    </div>
  )
}