'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from './store'
import { Phase } from './types'
import { generateBlueNoiseTexture } from './blue-noise'
import { wristYToExtrusionDrift, wristProximityWarp } from './vision/wrist-mapping'
import { getGradientColor, getMoodGradientColor, getTheme, PHASE_COLORS } from './theme'
import { MOOD_CONFIGS } from './mood-config'
import { generateDitherAtlas, generateHalftoneDotAtlas, generateSpectralSprite } from './dither'

export function Scene({ 
  pixelDataRef, 
  analyzerRef,
  triggerVoice,
  triggerClick
}: { 
  pixelDataRef: React.RefObject<Float32Array>,
  analyzerRef: React.RefObject<any>,
  triggerVoice: (brightness: number, noteIndex: number, phase?: Phase) => void,
  triggerClick: (note?: string, duration?: string) => void,
}) {
  const blocksRef = useRef<THREE.InstancedMesh>(null)
  const radioRingRef = useRef<THREE.InstancedMesh>(null)
  const dotsMeshRef = useRef<THREE.InstancedMesh>(null)
  const linesMeshRef = useRef<THREE.InstancedMesh>(null)
  const asciiMeshRef = useRef<THREE.InstancedMesh>(null)
  const pixelMeshRef = useRef<THREE.InstancedMesh>(null)
  
  const { resolution, threshold, extrusion, viewMode, theme, inverse, audioReactive, audioEnabled, renderMode, showGrid, ditherIntensity, moodEnabled, currentMood, currentPhase, handTracking, gestureTrackingStatus } = useStore()

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

  // Stable per-cell phosphor-flicker offsets (±3%), seeded ONCE per resolution
  // change so the flicker is deterministic per cell rather than a per-frame
  // Math.random() storm. emissiveIntensity is a shared material property (one
  // value per instanced mesh, not per instance), so the per-frame loop samples
  // a rotating index from this seeded array to produce a stable shimmer.
  const flickerOffsets = useMemo(() => {
    const arr = new Float32Array(count)
    for (let i = 0; i < count; i++) arr[i] = (Math.random() * 2 - 1) * 0.03
    return arr
  }, [count])

  // Reusable scratch color for the hot per-cell getGradientColor path — avoids
  // a per-cell THREE.Color allocation (consumed immediately by setColorAt /
  // spectral color attr, never retained).
  const cellColorScratch = useMemo(() => new THREE.Color(), [])

  // Stable array of instanced-mesh refs shared by the material-effect and the
  // per-frame loop.
  const meshRefs = useMemo(
    () => [blocksRef, radioRingRef, dotsMeshRef, linesMeshRef, asciiMeshRef, pixelMeshRef],
    [],
  )

  // Chrome color: UI / grid / emissive glow only. Per-cell diffuse is now
  // always driven by `getGradientColor(theme, brightness)` via instanceColor,
  // so the mesh material base color is white and instanceColor tints it.
  const chromeColor = useMemo(() => {
    if (moodEnabled) return PHASE_COLORS[currentPhase]
    return getTheme(theme).accent
  }, [theme, moodEnabled, currentPhase])

  // Constant material props (base color, emissive color, roughness, metalness)
  // only change on theme/mood/phase/resolution — set them here, not per-frame.
  // Only emissiveIntensity (audio + breath driven) stays in useFrame.
  useEffect(() => {
    let targetRoughness = 0.4
    let targetMetalness = 0.6
    if (moodEnabled) {
      if (currentPhase === 'calm') { targetRoughness = 0.6; targetMetalness = 0.3 }
      else if (currentPhase === 'active') { targetRoughness = 0.4; targetMetalness = 0.6 }
      else { targetRoughness = 0.2; targetMetalness = 0.8 }
    }
    meshRefs.forEach(ref => {
      if (ref.current?.material instanceof THREE.MeshStandardMaterial) {
        const mat = ref.current.material
        // White base so instanceColor (per-cell gradient) reads true.
        // ascii has no instanceColor (glyph atlas + alphaTest), so its
        // material.color tints glyphs directly — keep it chrome-themed.
        mat.color.set(ref.current === asciiMeshRef.current ? chromeColor : '#ffffff')
        mat.emissive.set(chromeColor)
        mat.roughness = targetRoughness
        mat.metalness = targetMetalness
      }
    })
  }, [chromeColor, moodEnabled, currentPhase, theme, resolution, meshRefs])

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

  const spectralRef = useRef<THREE.InstancedMesh>(null)

  // Per-instance glyph index for the ascii atlas (0..9 = '@%#*+=-:. ').
  // Sized to the instance count; values are written per-cell in useFrame
  // and the attribute is attached to the ascii mesh's plane geometry.
  const aGlyphIndex = useMemo(
    () => new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
    [count],
  )

  const asciiAtlas = useMemo(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 640; canvas.height = 64
    ctx.fillStyle = 'white'; ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    '@%#*+=-:. '.split('').forEach((char, i) => ctx.fillText(char, (i * 64) + 32, 32))
    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = texture.magFilter = THREE.NearestFilter
    return texture
  }, [])

  // Ascii material: MeshStandardMaterial with the glyph atlas as `map`, plus
  // an onBeforeCompile patch that uses a per-instance `aGlyphIndex` attribute
  // to shift `vMapUv` so each cell samples its own glyph column. Requires a
  // stable material instance (not a JSX element) so onBeforeCompile fires once
  // and the per-instance attribute is sampled per draw call.
  const asciiMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ map: asciiAtlas, transparent: true, alphaTest: 0.4 })
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aGlyphIndex;')
        .replace(
          '#include <uv_vertex>',
          '#include <uv_vertex>\nvMapUv = vec2( ( vMapUv.x + aGlyphIndex ) / 10.0, vMapUv.y );',
        )
    }
    return mat
  }, [asciiAtlas])

  const spacing = 0.25

useFrame((state) => {
    if (!pixelDataRef.current) return

    let emissiveScale = 1.0

    if (moodEnabled) {
      switch (currentPhase) {
        case 'calm':
          emissiveScale = 0.5
          break
        case 'active':
          emissiveScale = 1.5
          break
        case 'climax':
          emissiveScale = 3.0
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

    // Spectral mode is audio-native: populate fftData whenever audio is
    // enabled (independent of audioReactive) so the FFT-driven bars always
    // have fresh data. audioReactive above still gates audioIntensity for
    // emissive/extrusion effects on other modes.
    if (audioEnabled && !audioReactive && analyzerRef.current) {
      const analyser = analyzerRef.current.analyser || analyzerRef.current
      if (analyser.getByteFrequencyData) {
        analyser.getByteFrequencyData(fftData)
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
          triggerVoice(brightness, noteIdx, currentPhase)
          triggerClick('C2', '32n')
          clicksThisFrame++
        }
        prevStates[id] = isActive ? 1 : 0

        const posX = (x - resolution / 2 + 0.5) * spacing
        const posY = (y - resolution / 2 + 0.5) * spacing

        const proximityWarp =
          gestureTrackingStatus === 'active' && handTracking.detected && handTracking.wrist
            ? wristProximityWarp(
                x,
                y,
                {
                  x: handTracking.wrist.x * (resolution - 1),
                  y: handTracking.wrist.y * (resolution - 1),
                  z: handTracking.wrist.z,
                },
                handTracking.detected,
              )
            : 0

        const zExtrusion = (brightness * effectiveExtrusion)
        const audioHeight = isActive ? (audioIntensity * effectiveExtrusion) : 0
        const finalZ = Math.max(0.05, zExtrusion + audioHeight) + proximityWarp
        const modeZ = finalZ
        
        const s = isActive ? 0.4 : 0.1
        const pSize = 0.4
        
        dummy.rotation.set(0, 0, 0)
        dummy.position.set(posX, posY, 0)
        dummy.scale.set(spacing * 0.9, spacing * 0.9, 0.05)

        if (viewMode === 'flat') {
          if (renderMode === 'ascii') {
            dummy.scale.set(spacing * s, spacing * s, 1)
          } else if (renderMode === 'pixel') {
            dummy.scale.set(spacing * s * 0.7, spacing * s * 0.7, 1)
          } else if (renderMode === 'dots') {
            dummy.scale.set(spacing * s * pSize, spacing * s * pSize, spacing * s * pSize)
          } else if (renderMode === 'lines') {
            dummy.scale.set(spacing * s * (0.5 + brightness), spacing * 0.15, 1)
          } else if (renderMode === 'radio') {
            // Radio is handled below
          } else {
            dummy.scale.set(spacing * s, spacing * s, 0.05)
          }
        } else {
          // Volumetric Mode
          dummy.position.set(posX, posY, modeZ / 2)
          if (renderMode === 'ascii') {
            dummy.scale.set(spacing * s, spacing * s, 1)
          } else if (renderMode === 'pixel') {
            dummy.scale.set(spacing * s * 0.7, spacing * s * 0.7, 1)
          } else if (renderMode === 'dots') {
            dummy.scale.set(spacing * 0.9 * pSize, spacing * 0.9 * pSize, spacing * 0.9 * pSize)
          } else if (renderMode === 'lines') {
            dummy.scale.set(Math.max(0.05, brightness) * spacing * 4, spacing * 0.15, spacing * 0.15)
          } else {
            dummy.scale.set(spacing * 0.9, spacing * 0.9, modeZ)
          }
        }
        
        dummy.updateMatrix()
        
        // Per-cell diffuse color: every theme resolves from its own gradient.
        // ascii has no instanceColor (glyph atlas tints via material.color), so
        // skip the gradient call there.
        const cellColor = renderMode === 'ascii'
          ? null
          : moodEnabled
            ? getMoodGradientColor(MOOD_CONFIGS[currentMood].baseHue, brightness, cellColorScratch)
            : getGradientColor(theme, brightness, cellColorScratch)
        if (cellColor && blocksRef.current && renderMode === 'blocks') blocksRef.current.setColorAt(id, cellColor)
        if (cellColor && pixelMeshRef.current && renderMode === 'pixel') pixelMeshRef.current.setColorAt(id, cellColor)
        if (cellColor && dotsMeshRef.current && renderMode === 'dots') dotsMeshRef.current.setColorAt(id, cellColor)
        if (cellColor && linesMeshRef.current && renderMode === 'lines') linesMeshRef.current.setColorAt(id, cellColor)
        
        if (renderMode === 'ascii') {
          // Atlas order is dense-to-sparse: '@%#*+=-:. '
          // brightness 1 → idx 0 ('@'), brightness 0 → idx 9 (' ').
          const glyphIdx = Math.floor((1 - brightness) * 9)
          aGlyphIndex.array[id] = glyphIdx
        }

        if (renderMode === 'blocks' && blocksRef.current) blocksRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'pixel' && pixelMeshRef.current) pixelMeshRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'ascii' && asciiMeshRef.current) asciiMeshRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'dots' && dotsMeshRef.current) dotsMeshRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'lines' && linesMeshRef.current) linesMeshRef.current.setMatrixAt(id, dummy.matrix)
        
        if (renderMode === 'radio' && radioRingRef.current) {
          const glowRadius = spacing * (0.3 + brightness * 0.7)
          dummy.position.set(posX, posY, finalZ)
          dummy.scale.set(glowRadius, glowRadius, 1)
          dummy.rotation.set(0, 0, 0)
          dummy.updateMatrix()
          radioRingRef.current.setMatrixAt(id, dummy.matrix)
          if (cellColor) radioRingRef.current.setColorAt(id, cellColor)
        }

        // Spectral: FFT-bin-driven bars. Each column samples one FFT bin;
        // bar height and color track bin magnitude (audio-native, not
        // brightness-mirroring like other modes).
        if (renderMode === 'spectral' && spectralRef.current && fftData) {
          const binIdx = Math.floor((x / resolution) * fftData.length)
          const binValue = fftData[binIdx] / 255
          const barHeight = binValue * extrusion * 4
          dummy.position.set(posX, posY, finalZ + barHeight / 2)
          dummy.scale.set(spacing * 0.9, spacing * 0.9, Math.max(0.01, barHeight))
          dummy.rotation.set(0, 0, 0)
          dummy.updateMatrix()
          spectralRef.current.setMatrixAt(id, dummy.matrix)
          const spectralColor = moodEnabled
            ? getMoodGradientColor(MOOD_CONFIGS[currentMood].baseHue, binValue, cellColorScratch)
            : getGradientColor(theme, binValue, cellColorScratch)
          spectralRef.current.setColorAt(id, spectralColor)
        }
      }
    }
    
    if (renderMode === 'spectral' && spectralRef.current) {
      spectralRef.current.instanceMatrix.needsUpdate = true
      if (spectralRef.current.instanceColor) spectralRef.current.instanceColor.needsUpdate = true
    }
    if (renderMode === 'ascii') {
      aGlyphIndex.needsUpdate = true
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

    // Only per-frame material state lives here: emissiveIntensity (audio +
    // breath driven) and the instanceColor/instanceMatrix dirty flags.
    // Constant props (color/emissive/roughness/metalness) are set in the
    // useEffect above, keyed on theme/mood/phase/resolution.
    const baseEmissive = (theme === 'dark' ? 0.8 : 0.3) + (audioIntensity * 4)
    // Stable phosphor flicker: sample one seeded per-cell offset via a
    // time-rotating index (~24Hz) so the shared material emissiveIntensity
    // shimmers without a per-frame Math.random() storm. ±3%, clamped >= 0.
    const flickerIdx = Math.floor(state.clock.elapsedTime * 24) % count
    const flicker = flickerOffsets[flickerIdx] ?? 0
    meshRefs.forEach(ref => {
      if (ref.current) {
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
        if (ref.current.material instanceof THREE.MeshStandardMaterial) {
          const mat = ref.current.material
          const flickered = Math.max(0, baseEmissive * (1 + flicker))
          mat.emissiveIntensity = moodEnabled ? flickered * emissiveScale * breathMultiplier : flickered
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


      <instancedMesh key={`spectral-${resolution}`} ref={spectralRef} args={[null as any, null as any, count]} visible={renderMode === 'spectral'}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" map={spectralSprite} emissive={chromeColor} emissiveIntensity={1.5} transparent alphaTest={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>

      <instancedMesh key={`blocks-${resolution}`} ref={blocksRef} args={[null as any, null as any, count]} visible={renderMode === 'blocks'}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" map={halftoneDotAtlas} emissive={chromeColor} roughness={0.4} metalness={0.6} />
      </instancedMesh>

      {/* High-fidelity Radio Components */}
      <instancedMesh key={`radio-ring-${resolution}`} ref={radioRingRef} args={[null as any, null as any, count]} visible={renderMode === 'radio'}>
        <torusGeometry args={[0.5, 0.05, 16, 32]} />
        <meshStandardMaterial color="#ffffff" map={ditherAtlas} emissive={chromeColor} emissiveIntensity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
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
        <planeGeometry args={[1, 1]}>
          <primitive object={aGlyphIndex} attach="attributes-aGlyphIndex" />
        </planeGeometry>
        <primitive object={asciiMaterial} attach="material" />
      </instancedMesh>
    </>
  )
}
