'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Bloom, EffectComposer, ChromaticAberration, Scanline, Noise, Vignette } from '@react-three/postprocessing'
import { useStore } from './store'
import { Scene } from './Scene'
import { useControls, folder, useRegister } from 'leva'
import { useWebcam, useSampler } from './hooks'
import { useAudio } from './audio'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { AIComposer } from './ai-composer'

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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'Space') {
        e.preventDefault()
        const currentMode = useStore.getState().viewMode
        const nextMode = currentMode === 'flat' ? 'volumetric' : 'flat'
        setViewMode(nextMode)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [setViewMode])

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

  const { currentGesture } = useStore()
  const register = useRegister()
  
  useEffect(() => {
    if (!currentGesture) return
    
    const composer = new AIComposer()
    const experience = composer.composeExperience(currentGesture)
    
    // Spawn runtime Leva panel based on hallucinated controls
    experience.hallucinatedControls.forEach(control => {
      register(control.id, {
        value: control.defaultValue,
        min: control.min,
        max: control.max,
        step: control.step,
        label: control.label
      })
    })
  }, [currentGesture, register])

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
          <h1 className="text-3xl mb-4 tracking-[0.2em]">THRESHOLD V3</h1>
          <p className="text-xs opacity-50 mb-10 leading-relaxed tracking-widest">
            VOLUMETRIC TERMINAL INSTRUMENT<br />
            READY FOR INITIALIZATION
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
      <Canvas shadows gl={{ antialias: false }}>
        <AnimatedCamera />
        <color attach="background" args={['#050505']} />
        <EffectComposer>
          <Bloom luminanceThreshold={0.5} intensity={0.8} levels={8} mipmapBlur />
          <ChromaticAberration offset={new THREE.Vector2(0.001, 0.001)} />
          <Scanline opacity={0.1} density={2} />
          <Noise opacity={0.03} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} color={theme === 'acid' ? '#ccff00' : '#00ff41'} />
        <Scene pixelDataRef={dataRef} analyzerRef={analyzerRef} synthRef={synthRef} clickSynthRef={clickSynthRef} />
      </Canvas>
    </div>
  )
}
