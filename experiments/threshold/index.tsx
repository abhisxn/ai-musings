'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Bloom, EffectComposer, ChromaticAberration, Scanline, Noise, Vignette } from '@react-three/postprocessing'
import { useStore } from './store'
import { Scene } from './Scene'
import { useControls, folder } from 'leva'
import { useWebcam, useSampler } from './hooks'
import { useAudio } from './audio'
import { useEffect, useState, useRef } from 'react'
import * as THREE from 'three'

const tempTargetPos = new THREE.Vector3()
const tempLookAt = new THREE.Vector3(0, 0, 0)

function AnimatedCamera() {
  const viewMode = useStore(state => state.viewMode)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  useFrame(() => {
    if (!cameraRef.current) return
    const targetPos = viewMode === 'flat' ? [0, 0, 15] : [10, -10, 15]
    tempTargetPos.set(targetPos[0], targetPos[1], targetPos[2])
    
    cameraRef.current.position.lerp(tempTargetPos, 0.05)
    cameraRef.current.lookAt(tempLookAt)
    cameraRef.current.updateProjectionMatrix()
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={50} />
}

export default function ThresholdExperiment() {
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
    audioEnabled, setAudioEnabled,
    audioReactive, setAudioReactive,
    soundType, setSoundType,
    volume, setVolume
  } = useStore()

  const { videoRef } = useWebcam()
  const { loading, dataRef } = useSampler()
  const { analyzerRef } = useAudio()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setViewMode(viewMode === 'flat' ? 'volumetric' : 'flat')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [viewMode, setViewMode])

  useControls('Signal', {
    source: { value: sourceMode, options: ['pixel', 'ai'], onChange: setSourceMode },
    resolution: { value: resolution, min: 16, max: 128, step: 1, onChange: setResolution },
    inverse: { value: inverse, onChange: setInverse },
  })

  useControls('Visuals', {
    viewMode: { value: viewMode, options: ['flat', 'volumetric'], onChange: setViewMode },
    threshold: { value: threshold, min: 0, max: 1, step: 0.01, onChange: setThreshold },
    extrusion: { value: extrusion, min: 0, max: 20, step: 0.1, onChange: setExtrusion },
    renderMode: { value: renderMode, options: ['radio', 'dots', 'blocks', 'particles', 'ascii'], onChange: setRenderMode },
    theme: { value: theme, options: ['dark', 'light', 'acid', 'heatmap'], onChange: setTheme },
  })

  useControls('Audio', {
    enabled: { value: audioEnabled, onChange: setAudioEnabled },
    reactive: { value: audioReactive, onChange: setAudioReactive },
    audioMode: { value: soundType, options: ['sine', 'chimes', 'bells', 'pulse'], onChange: setSoundType },
    volume: { value: volume, min: -60, max: 0, step: 1, onChange: setVolume },
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
    <div className="w-full h-full bg-[#050505] relative">
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

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
          <Bloom luminanceThreshold={0.5} intensity={1.5} levels={8} mipmapBlur />
          <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
          <Scanline opacity={0.15} density={2} />
          <Noise opacity={0.05} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
        
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} color={theme === 'acid' ? '#ccff00' : '#00ff41'} />
        
        <Scene pixelDataRef={dataRef} analyzerRef={analyzerRef} />
      </Canvas>
    </div>
  )
}
