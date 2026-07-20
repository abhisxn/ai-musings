'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from './store'
import { generateBlueNoiseTexture } from './blue-noise'
import { wristYToExtrusionDrift } from './vision/wrist-mapping'
import { getGradientColor, getTheme, PHASE_COLORS } from './theme'
import { generateDitherAtlas, generateHalftoneDotAtlas, generateSpectralSprite } from './dither'

export function Scene({ 
  pixelDataRef, 
  analyzerRef,
  triggerVoice,
  triggerClick
}: { 
  pixelDataRef: React.RefObject<Float32Array>,
  analyzerRef: React.RefObject<any>,
  triggerVoice: (brightness: number, noteIndex: number) => void,
  triggerClick: (note?: string, duration?: string) => void,
}) {
  const blocksRef = useRef<THREE.InstancedMesh>(null)
  const radioRingRef = useRef<THREE.InstancedMesh>(null)
  const radioDotRef = useRef<THREE.InstancedMesh>(null)
  const dotsMeshRef = useRef<THREE.InstancedMesh>(null)
  const linesMeshRef = useRef<THREE.InstancedMesh>(null)
  const asciiMeshRef = useRef<THREE.InstancedMesh>(null)
  const pixelMeshRef = useRef<THREE.InstancedMesh>(null)
  
  const { resolution, threshold, extrusion, viewMode, theme, inverse, audioReactive, audioEnabled, renderMode, showGrid, ditherIntensity, moodEnabled, currentPhase, handTracking, gestureTrackingStatus } = useStore()

  // Wrist-driven extrusion drift: `extrusion` (Leva slider) stays the base
  // value; when gesture tracking is active, wrist height adds a small drift
  // on top - same signal that drives the ambient glow in ThresholdView, now
  // also proving out on the volumetric depth.
  const effectiveExtrusion = useMemo(() => {
    if (gestureTrackingStatus !== 'active') return extrusion
    return extrusion + wristYToExtrusionDrift(handTracking.wrist, handTracking.detected)
  }, [extrusion, gestureTrackingStatus, handTracking.wrist, handTracking.detected])

  const NOTES = useMemo(() => ['C2', 'E2', 'G2', 'A2', 'C3', 'E3', 'G3', 'A3', 'C4', 'E4', 'G4', 'A4'], [])
  
  const count = resolution * resolution
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const fftData = useMemo(() => new Uint8Array(64), [])
  const prevStates = useMemo(() => new Uint8Array(128 * 128), [])

  const blueNoise = useMemo(() => generateBlueNoiseTexture(128), [])

  // Chrome color: UI / grid / emissive glow only. Per-cell diffuse is now
  // always driven by `getGradientColor(theme, brightness)` via instanceColor,
  // so the mesh material base color is white and instanceColor tints it.
  const chromeColor = useMemo(() => {
    if (moodEnabled) return PHASE_COLORS[currentPhase]
    return getTheme(theme).accent
  }, [theme, moodEnabled, currentPhase])

  // Shared dither atlas — single repeat across every mesh that uses it
  // (pixel / dots / radio ring / lines). A shared repeat keeps the reskin
  // simple and avoids per-mesh texture clones; per-mesh tiling can be tuned
  // later if a mode needs a different grain density.
  const ditherAtlas = useMemo(() => {
    const t = generateDitherAtlas(4)
    t.repeat.set(8, 8)
    return t
  }, [])
  const halftoneDotAtlas = useMemo(() => {
    const t = generateHalftoneDotAtlas(64)
    t.repeat.set(4, 4)
    return t
  }, [])
  const spectralSprite = useMemo(() => generateSpectralSprite(64), [])

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

    let emissiveScale = 1.0
    let targetRoughness = 0.4
    let targetMetalness = 0.6

    if (moodEnabled) {
      switch (currentPhase) {
        case 'calm':
          emissiveScale = 0.5
          targetRoughness = 0.6
          targetMetalness = 0.3
          break
        case 'active':
          emissiveScale = 1.5
          targetRoughness = 0.4
          targetMetalness = 0.6
          break
        case 'climax':
          emissiveScale = 3.0
          targetRoughness = 0.2
          targetMetalness = 0.8
          break
      }
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

        const bx = Math.floor((x / resolution) * 128)
        const by = Math.floor((y / resolution) * 128)
        const noiseIdx = by * 128 + bx
        const modulatedThreshold = threshold + ((blueNoise[noiseIdx] / 255) - 0.5) * ditherIntensity
        const isActive = brightness > modulatedThreshold
        const wasActive = prevStates[id] === 1

        if (isActive && !wasActive && audioEnabled && clicksThisFrame < MAX_CLICKS_PER_FRAME) {
          const noteIdx = Math.floor(((resolution - y) / resolution) * NOTES.length)
          triggerVoice(brightness, noteIdx)
          triggerClick('C2', '32n')
          clicksThisFrame++
        }
        prevStates[id] = isActive ? 1 : 0

        const zExtrusion = (brightness * effectiveExtrusion)
        const audioHeight = isActive ? (audioIntensity * effectiveExtrusion) : 0
        const finalZ = Math.max(0.05, zExtrusion + audioHeight)
        const modeZ = finalZ

        const posX = ((resolution - x) - resolution / 2) * spacing
        const posY = (y - resolution / 2) * -spacing
        
        const s = isActive ? 0.4 : 0.1
        const pSize = 0.4
        
        dummy.rotation.set(0, 0, 0)
        dummy.position.set(posX, posY, 0)
        dummy.scale.set(spacing * 0.9, spacing * 0.9, 0.05)

        if (viewMode === 'flat') {
          if (renderMode === 'ascii' || renderMode === 'pixel') {
            dummy.scale.set(spacing * s, spacing * s, 1)
          } else if (renderMode === 'dots') {
            dummy.scale.set(spacing * s * pSize, spacing * s * pSize, spacing * s * pSize)
          } else if (renderMode === 'lines') {
            dummy.scale.set(spacing * 0.15, spacing * s * (0.5 + brightness), 1)
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
          } else if (renderMode === 'dots') {
            dummy.scale.set(spacing * 0.9 * pSize, spacing * 0.9 * pSize, spacing * 0.9 * pSize)
          } else if (renderMode === 'lines') {
            dummy.scale.set(spacing * 0.15, Math.max(0.05, brightness) * spacing * 4, spacing * 0.15)
          } else {
            dummy.scale.set(spacing * 0.9, spacing * 0.9, modeZ)
          }
        }
        
        dummy.updateMatrix()
        
        // Per-cell diffuse color: every theme resolves from its own gradient.
        const cellColor = getGradientColor(theme, brightness)
        if (blocksRef.current && renderMode === 'blocks') blocksRef.current.setColorAt(id, cellColor)
        if (pixelMeshRef.current && renderMode === 'pixel') pixelMeshRef.current.setColorAt(id, cellColor)
        if (dotsMeshRef.current && renderMode === 'dots') dotsMeshRef.current.setColorAt(id, cellColor)
        if (linesMeshRef.current && renderMode === 'lines') linesMeshRef.current.setColorAt(id, cellColor)
        
        if (renderMode === 'blocks' && blocksRef.current) blocksRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'pixel' && pixelMeshRef.current) pixelMeshRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'ascii' && asciiMeshRef.current) asciiMeshRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'dots' && dotsMeshRef.current) dotsMeshRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'lines' && linesMeshRef.current) linesMeshRef.current.setMatrixAt(id, dummy.matrix)
        
        if (renderMode === 'radio' && radioRingRef.current && radioDotRef.current) {
           // Outer Ring
           dummy.rotation.x = Math.PI / 2
           dummy.position.set(posX, posY, viewMode === 'flat' ? 0 : modeZ / 2)
           // Fix: Scaled for 2D vs 3D
           const ringScale = viewMode === 'flat' ? 0.05 : modeZ
           dummy.scale.set(spacing * 0.8, ringScale, spacing * 0.8)
           dummy.updateMatrix()
           radioRingRef.current.setMatrixAt(id, dummy.matrix)
           radioRingRef.current.setColorAt(id, cellColor)
           
           // Inner Dot
           const dotSize = isActive ? 0.4 : 0.01
           const dotHeight = viewMode === 'flat' ? 0.06 : modeZ + 0.05
           dummy.scale.set(spacing * dotSize, dotHeight, spacing * dotSize)
           dummy.updateMatrix()
           radioDotRef.current.setMatrixAt(id, dummy.matrix)
           radioDotRef.current.setColorAt(id, cellColor)
        }

        // Spectral Point Cloud (House of Cards style)
        if (renderMode === 'spectral' && spectralGeometry) {
          const positions = spectralGeometry.attributes.position.array as Float32Array
          const colors = spectralGeometry.attributes.color.array as Float32Array
          
          const shimmer = (Math.random() - 0.5) * 0.02
          positions[id * 3] = posX + (isActive ? shimmer : 0)
          positions[id * 3 + 1] = posY + (isActive ? shimmer : 0)
          positions[id * 3 + 2] = viewMode === 'flat' ? 0 : (modeZ + shimmer)
          
          const boost = isActive ? 2.5 : 0.3
          colors[id * 3] = cellColor.r * boost
          colors[id * 3 + 1] = cellColor.g * boost
          colors[id * 3 + 2] = cellColor.b * boost
        }
      }
    }
    
    if (renderMode === 'spectral' && spectralRef.current) {
      spectralGeometry.attributes.position.needsUpdate = true
      spectralGeometry.attributes.color.needsUpdate = true
    }

    let breathMultiplier = 1.0
    if (moodEnabled) {
      const t = state.clock.elapsedTime
      switch (currentPhase) {
        case 'calm':
          breathMultiplier = 1.2 + Math.sin(t * 0.8) * 0.6   // slow pulse 0.6→1.8
          break
        case 'active':
          breathMultiplier = 1.0 + Math.sin(t * 2.0) * 0.15  // faster, subtle
          break
        case 'climax':
          breathMultiplier = 1.0 + Math.sin(t * 4.0) * 0.08  // fast tremor
          break
      }
    }

    const meshRefs = [blocksRef, radioRingRef, radioDotRef, dotsMeshRef, linesMeshRef, asciiMeshRef, pixelMeshRef]
    meshRefs.forEach(ref => {
      if (ref.current) {
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
        if (ref.current.material instanceof THREE.MeshStandardMaterial) {
          const mat = ref.current.material
          // White base so instanceColor (per-cell gradient) reads true.
          // ascii has no instanceColor (glyph atlas + alphaTest), so its
          // material.color tints glyphs directly — keep it chrome-themed.
          mat.color.set(ref.current === asciiMeshRef.current ? chromeColor : '#ffffff')
          mat.emissive.set(chromeColor)
          if (moodEnabled) {
            mat.emissiveIntensity = ((theme === 'dark' ? 0.8 : 0.3) + (audioIntensity * 4)) * emissiveScale * breathMultiplier
            mat.roughness = targetRoughness
            mat.metalness = targetMetalness
          } else {
            mat.emissiveIntensity = ((theme === 'dark' ? 0.8 : 0.3) + (audioIntensity * 4))
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
        sectionColor={chromeColor} 
        sectionThickness={1.0} 
        cellColor="#1a1a1a" 
        cellThickness={0.8} 
        position={[0, 0, -1.0]} 
        rotation={[Math.PI / 2, 0, 0]}
      />


      <points ref={spectralRef} geometry={spectralGeometry} visible={renderMode === 'spectral'}>
        <pointsMaterial 
          size={0.1} 
          map={spectralSprite}
          alphaTest={0.1}
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
        <meshStandardMaterial color="#ffffff" map={halftoneDotAtlas} emissive={chromeColor} roughness={0.4} metalness={0.6} />
      </instancedMesh>

      {/* High-fidelity Radio Components */}
      <instancedMesh key={`radio-ring-${resolution}`} ref={radioRingRef} args={[null as any, null as any, count]} visible={renderMode === 'radio'}>
        <torusGeometry args={[0.5, 0.05, 16, 32]} />
        <meshStandardMaterial color="#ffffff" map={ditherAtlas} emissive={chromeColor} emissiveIntensity={0.5} />
      </instancedMesh>
      
      <instancedMesh key={`radio-dot-${resolution}`} ref={radioDotRef} args={[null as any, null as any, count]} visible={renderMode === 'radio'}>
        <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
        <meshStandardMaterial color="#ffffff" emissive={chromeColor} emissiveIntensity={2} />
      </instancedMesh>

      <instancedMesh key={`pixel-${resolution}`} ref={pixelMeshRef} args={[null as any, null as any, count]} visible={renderMode === 'pixel'}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffffff" emissive={chromeColor} emissiveIntensity={2} alphaMap={ditherAtlas} transparent opacity={0.9} />
      </instancedMesh>

      <instancedMesh key={`dots-${resolution}`} ref={dotsMeshRef} args={[null as any, null as any, count]} visible={renderMode === 'dots'}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive={chromeColor} roughness={0.1} metalness={0.8} alphaMap={ditherAtlas} transparent />
      </instancedMesh>

      <instancedMesh key={`lines-${resolution}`} ref={linesMeshRef} args={[null as any, null as any, count]} visible={renderMode === 'lines'}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" emissive={chromeColor} emissiveIntensity={2} alphaMap={ditherAtlas} transparent />
      </instancedMesh>

      <instancedMesh key={`ascii-${resolution}`} ref={asciiMeshRef} args={[null as any, null as any, count]} visible={renderMode === 'ascii'}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={asciiAtlas} transparent color={chromeColor} emissive={chromeColor} alphaTest={0.4} />
      </instancedMesh>
    </>
  )
}
