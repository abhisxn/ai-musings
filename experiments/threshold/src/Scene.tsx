'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from './store'

export function Scene({ 
  pixelDataRef, 
  analyzerRef,
  synthRef,
  clickSynthRef
}: { 
  pixelDataRef: React.RefObject<Float32Array>,
  analyzerRef: React.RefObject<any>,
  synthRef: React.RefObject<any>,
  clickSynthRef: React.RefObject<any>
}) {
  const blocksRef = useRef<THREE.InstancedMesh>(null)
  const radioRingRef = useRef<THREE.InstancedMesh>(null)
  const radioDotRef = useRef<THREE.InstancedMesh>(null)
  const dotsMeshRef = useRef<THREE.InstancedMesh>(null)
  const asciiMeshRef = useRef<THREE.InstancedMesh>(null)
  const pixelMeshRef = useRef<THREE.InstancedMesh>(null)
  
  const { resolution, threshold, extrusion, viewMode, theme, inverse, audioReactive, audioEnabled, renderMode, showGrid } = useStore()
  const { currentGesture, currentMode, hallucinatedControls, currentShader } = useStore()
  
  const NOTES = useMemo(() => ['C2', 'E2', 'G2', 'A2', 'C3', 'E3', 'G3', 'A3', 'C4', 'E4', 'G4', 'A4'], [])
  
  const count = resolution * resolution
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const fftData = useMemo(() => new Uint8Array(64), [])
  const prevStates = useMemo(() => new Uint8Array(128 * 128), [])

  const color = useMemo(() => {
    switch (theme) {
      case 'acid': return '#ccff00'
      case 'light': return '#ffffff'
      case 'heatmap': return '#ff003c' // Base for heatmap logic
      default: return '#00ff41'
    }
  }, [theme])

  // House of Cards Spectral Palette (Blue -> Cyan -> Green -> Yellow -> Red)
  const getHeatmapColor = (b: number) => {
    const r = b < 0.5 ? 0 : Math.min(255, (b - 0.5) * 2 * 255)
    const g = b < 0.5 ? Math.min(255, b * 2 * 255) : Math.min(255, (1 - b) * 2 * 255)
    const b_val = b > 0.5 ? 0 : Math.min(255, (0.5 - b) * 2 * 255)
    return new THREE.Color(`rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b_val)})`)
  }

  const spectralRef = useRef<THREE.Points>(null)
  const spectralGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [count])

  const asciiAtlas = useMemo(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 512; canvas.height = 64
    ctx.fillStyle = 'white'; ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    '@%#*+=-:. '.split('').forEach((char, i) => ctx.fillText(char, (i * 64) + 32, 32))
    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = texture.magFilter = THREE.NearestFilter
    return texture
  }, [])

  const spacing = 0.25

useFrame((state) => {
    if (!pixelDataRef.current) return

    let emissiveColor = new THREE.Color(color)
    let emissiveScale = 1.0
    let targetRoughness = 0.4
    let targetMetalness = 0.6

    switch (currentMode) {
      case 'glitch':
        emissiveColor = new THREE.Color('#ff00ff')
        emissiveScale = 3.0
        targetRoughness = 0.2
        targetMetalness = 0.8
        break
      case 'bloom':
        emissiveColor = new THREE.Color('#00ffff')
        emissiveScale = 2.0
        targetRoughness = 0.6
        targetMetalness = 0.3
        break
      case 'bass':
        emissiveColor = new THREE.Color('#ff4400')
        emissiveScale = 4.0
        targetRoughness = 0.3
        targetMetalness = 0.7
        break
    }

    let audioIntensity = 0
    if (audioEnabled && audioReactive && analyzerRef.current) {
      const analyser = analyzerRef.current.analyser || analyzerRef.current
      if (analyser.getByteFrequencyData) {
        analyser.getByteFrequencyData(fftData)
        let sum = 0
        for (let j = 0; j < 8; j++) sum += fftData[j]
        audioIntensity = (sum / 8) / 255
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

        if (isActive && !wasActive && audioEnabled && clicksThisFrame < MAX_CLICKS_PER_FRAME) {
          if (synthRef.current) {
            const noteIdx = Math.floor(((resolution - y) / resolution) * NOTES.length)
            const note = NOTES[Math.max(0, Math.min(NOTES.length - 1, noteIdx))]
            synthRef.current.triggerAttackRelease(note, "16n")
          }
          if (clickSynthRef.current) {
            clickSynthRef.current.triggerAttackRelease("C2", "32n")
          }
          clicksThisFrame++
        }
        prevStates[id] = isActive ? 1 : 0

        const zExtrusion = (brightness * extrusion)
        const audioHeight = isActive ? (audioIntensity * extrusion) : 0
        const finalZ = Math.max(0.05, zExtrusion + audioHeight)
        const time = state.clock.elapsedTime
        let modeZ = finalZ
        if (currentMode === 'glitch') {
          modeZ = finalZ + Math.sin(time * 10 + id * 0.1) * 0.3
        } else if (currentMode === 'bass') {
          const beat = 0.5 + 0.5 * Math.sin(time * 4)
          modeZ = finalZ * (0.5 + beat * 0.5)
        }
        
        const posX = ((resolution - x) - resolution / 2) * spacing
        const posY = (y - resolution / 2) * -spacing
        
        const s = isActive ? 0.9 : 0.2
        
        dummy.rotation.set(0, 0, 0)
        dummy.position.set(posX, posY, 0)
        dummy.scale.set(spacing * 0.9, spacing * 0.9, 0.05)

        if (viewMode === 'flat') {
          if (renderMode === 'ascii' || renderMode === 'pixel') {
            dummy.scale.set(spacing * s, spacing * s, 1)
          } else if (renderMode === 'dots' || renderMode === 'particles') {
            const pSize = renderMode === 'dots' ? 0.4 : 0.1
            dummy.scale.set(spacing * s * pSize, spacing * s * pSize, spacing * s * pSize)
          } else if (renderMode === 'radio') {
            // Radio is handled below
          } else {
            dummy.scale.set(spacing * s, spacing * s, 0.05)
          }
        } else {
          // Volumetric Mode
          dummy.position.set(posX, posY, modeZ / 2)
          if (renderMode === 'ascii' || renderMode === 'pixel') {
            dummy.scale.set(spacing * s, spacing * s, 1)
          } else if (renderMode === 'dots' || renderMode === 'particles') {
            const pSize = renderMode === 'dots' ? 0.4 : 0.1
            dummy.scale.set(spacing * 0.9 * pSize, spacing * 0.9 * pSize, spacing * 0.9 * pSize)
          } else {
            dummy.scale.set(spacing * 0.9, spacing * 0.9, modeZ)
          }
        }
        
        dummy.updateMatrix()
        
        // Heatmap Color logic for Instanced Meshes
        if (theme === 'heatmap') {
          const hmColor = getHeatmapColor(brightness)
          if (blocksRef.current && renderMode === 'blocks') blocksRef.current.setColorAt(id, hmColor)
          if (pixelMeshRef.current && renderMode === 'pixel') pixelMeshRef.current.setColorAt(id, hmColor)
          if (dotsMeshRef.current && (renderMode === 'dots' || renderMode === 'particles')) dotsMeshRef.current.setColorAt(id, hmColor)
        }
        
        if (renderMode === 'blocks' && blocksRef.current) blocksRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'pixel' && pixelMeshRef.current) pixelMeshRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'ascii' && asciiMeshRef.current) asciiMeshRef.current.setMatrixAt(id, dummy.matrix)
        if ((renderMode === 'dots' || renderMode === 'particles') && dotsMeshRef.current) dotsMeshRef.current.setMatrixAt(id, dummy.matrix)
        
        if (renderMode === 'radio' && radioRingRef.current && radioDotRef.current) {
           // Outer Ring
           dummy.rotation.x = Math.PI / 2
           dummy.position.set(posX, posY, viewMode === 'flat' ? 0 : modeZ / 2)
           // Fix: Scaled for 2D vs 3D
           const ringScale = viewMode === 'flat' ? 0.05 : modeZ
           dummy.scale.set(spacing * 0.8, ringScale, spacing * 0.8)
           dummy.updateMatrix()
           radioRingRef.current.setMatrixAt(id, dummy.matrix)
           
           // Inner Dot
           const dotSize = isActive ? 0.4 : 0.01
           const dotHeight = viewMode === 'flat' ? 0.06 : modeZ + 0.05
           dummy.scale.set(spacing * dotSize, dotHeight, spacing * dotSize)
           dummy.updateMatrix()
           radioDotRef.current.setMatrixAt(id, dummy.matrix)

           if (theme === 'heatmap') {
             const hmColor = getHeatmapColor(brightness)
             radioDotRef.current.setColorAt(id, hmColor)
           }
        }

        // Spectral Point Cloud (House of Cards style)
        if (renderMode === 'spectral' && spectralGeometry) {
          const positions = spectralGeometry.attributes.position.array as Float32Array
          const colors = spectralGeometry.attributes.color.array as Float32Array
          
          const shimmer = (Math.random() - 0.5) * 0.02
          positions[id * 3] = posX + (isActive ? shimmer : 0)
          positions[id * 3 + 1] = posY + (isActive ? shimmer : 0)
          positions[id * 3 + 2] = viewMode === 'flat' ? 0 : (modeZ + shimmer)
          
          const hmColor = theme === 'heatmap' ? getHeatmapColor(brightness) : new THREE.Color(color)
          const boost = isActive ? 2.5 : 0.3
          colors[id * 3] = hmColor.r * boost
          colors[id * 3 + 1] = hmColor.g * boost
          colors[id * 3 + 2] = hmColor.b * boost
        }
      }
    }
    
    if (renderMode === 'spectral' && spectralRef.current) {
      spectralGeometry.attributes.position.needsUpdate = true
      spectralGeometry.attributes.color.needsUpdate = true
    }

    const meshRefs = [blocksRef, radioRingRef, radioDotRef, dotsMeshRef, asciiMeshRef, pixelMeshRef]
    meshRefs.forEach(ref => {
      if (ref.current) {
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = theme === 'heatmap'
        if (ref.current.material instanceof THREE.MeshStandardMaterial) {
          const mat = ref.current.material
          if (currentMode) {
            mat.emissive.copy(emissiveColor)
            mat.emissiveIntensity = ((theme === 'dark' ? 1.5 : 0.5) + (audioIntensity * 8)) * emissiveScale
            mat.color.copy(emissiveColor)
            mat.roughness = targetRoughness
            mat.metalness = targetMetalness
          } else {
            mat.emissiveIntensity = ((theme === 'dark' ? 1.5 : 0.5) + (audioIntensity * 8))
            if (theme === 'heatmap') mat.color.set('#fff')
            else mat.color.set(color)
            mat.emissive.set(color)
            mat.roughness = 0.4
            mat.metalness = 0.6
          }
        }
        ref.current.instanceMatrix.needsUpdate = true
      }
    })
  })

  return (
    <>
      <Grid 
        infiniteGrid 
        fadeDistance={50} 
        fadeStrength={10} 
        cellSize={0.5} 
        sectionSize={2.5} 
        sectionColor={color} 
        sectionThickness={1.0} 
        cellColor="#1a1a1a" 
        cellThickness={0.8} 
        position={[0, 0, -1.0]} 
        rotation={[Math.PI / 2, 0, 0]}
      />


      <points ref={spectralRef} geometry={spectralGeometry} visible={renderMode === 'spectral'}>
        <pointsMaterial 
          size={0.1} 
          vertexColors 
          transparent 
          opacity={1.0} 
          blending={THREE.AdditiveBlending} 
          sizeAttenuation={true}
          depthWrite={false}
        />
      </points>

      <instancedMesh key={`blocks-${resolution}`} ref={blocksRef} args={[null as any, null as any, count]} visible={renderMode === 'blocks'}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} emissive={color} roughness={0.4} metalness={0.6} />
      </instancedMesh>

      {/* High-fidelity Radio Components */}
      <instancedMesh key={`radio-ring-${resolution}`} ref={radioRingRef} args={[null as any, null as any, count]} visible={renderMode === 'radio'}>
        <torusGeometry args={[0.5, 0.05, 16, 32]} />
        <meshStandardMaterial color="#111" emissive={color} emissiveIntensity={0.5} />
      </instancedMesh>
      
      <instancedMesh key={`radio-dot-${resolution}`} ref={radioDotRef} args={[null as any, null as any, count]} visible={renderMode === 'radio'}>
        <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </instancedMesh>

      <instancedMesh key={`pixel-${resolution}`} ref={pixelMeshRef} args={[null as any, null as any, count]} visible={renderMode === 'pixel'}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={0.9} />
      </instancedMesh>

      <instancedMesh key={`dots-${resolution}`} ref={dotsMeshRef} args={[null as any, null as any, count]} visible={renderMode === 'dots' || renderMode === 'particles'}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} roughness={0.1} metalness={0.8} />
      </instancedMesh>

      <instancedMesh key={`ascii-${resolution}`} ref={asciiMeshRef} args={[null as any, null as any, count]} visible={renderMode === 'ascii'}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={asciiAtlas} transparent color={color} emissive={color} alphaTest={0.4} />
      </instancedMesh>
    </>
  )
}
