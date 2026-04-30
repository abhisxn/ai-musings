'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from './store'

export function Scene({ 
  pixelDataRef, 
  analyzerRef,
  clickSynthRef
}: { 
  pixelDataRef: React.RefObject<Float32Array>,
  analyzerRef: React.RefObject<any>,
  clickSynthRef: React.RefObject<any>
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { resolution, threshold, extrusion, viewMode, theme, inverse, audioReactive, audioEnabled } = useStore()
  
  const count = resolution * resolution
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const fftData = useMemo(() => new Uint8Array(64), [])
  const prevStates = useMemo(() => new Uint8Array(resolution * resolution), [resolution])

  const color = useMemo(() => {
    switch (theme) {
      case 'acid': return '#ccff00'
      case 'light': return '#ffffff'
      case 'heatmap': return '#ff003c'
      default: return '#00ff41'
    }
  }, [theme])

  const spacing = 0.25

  useFrame(() => {
    if (!pixelDataRef.current || !meshRef.current) return

    let audioIntensity = 0
    if (audioEnabled && audioReactive && analyzerRef.current) {
      // Use native analyser for byte data if available, otherwise fallback
      const analyser = analyzerRef.current.analyser || analyzerRef.current
      if (analyser.getByteFrequencyData) {
        analyser.getByteFrequencyData(fftData)
        let sum = 0
        for (let j = 0; j < 16; j++) sum += fftData[j]
        audioIntensity = (sum / 16) / 255
      }
    }

    let clicksThisFrame = 0
    const MAX_CLICKS_PER_FRAME = 8

    let i = 0
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const id = i++
        let brightness = pixelDataRef.current[y * resolution + x] || 0
        if (inverse) brightness = 1.0 - brightness

        const isActive = brightness > threshold
        const wasActive = prevStates[id] === 1

        if (isActive && !wasActive && audioEnabled && clickSynthRef.current && clicksThisFrame < MAX_CLICKS_PER_FRAME) {
          clickSynthRef.current.triggerAttackRelease("C2", "32n")
          clicksThisFrame++
        }
        prevStates[id] = isActive ? 1 : 0

        const zExtrusion = isActive ? (brightness * extrusion) : 0.05
        const audioHeight = isActive ? (audioIntensity * extrusion * 2) : 0
        const finalZ = zExtrusion + audioHeight
        
        // Grid layout (Mirroring X to match webcam orientation)
        const posX = ((resolution - x) - resolution / 2) * spacing
        const posY = (y - resolution / 2) * -spacing
        
        if (viewMode === 'flat') {
          dummy.position.set(posX, posY, 0)
          dummy.scale.set(spacing * 0.9, spacing * 0.9, 0.05)
        } else {
          dummy.position.set(posX, posY, finalZ / 2)
          dummy.scale.set(spacing * 0.9, spacing * 0.9, Math.max(0.2, finalZ))
        }
        
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(id, dummy.matrix)
      }
    }
    
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.emissiveIntensity = (theme === 'dark' ? 2 : 0.5) + (audioIntensity * 10)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        roughness={0.1} 
        metalness={0.8} 
      />
    </instancedMesh>
  )
}
