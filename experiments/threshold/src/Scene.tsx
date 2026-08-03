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
import { generateDitherAtlas, generateHalftoneDotAtlas, generateBayerDitherAtlas } from './dither'
import { bayerDitherVertexShader, bayerDitherFragmentShader } from './shaders'

const PROXIMITY_EXTRUSION_BOOST = 0.5

export function Scene({
  pixelDataRef,
  analyzerRef,
  triggerVoice,
  triggerClick,
  frameTextureRef
}: {
  pixelDataRef: React.RefObject<Float32Array>,
  analyzerRef: React.RefObject<any>,
  triggerVoice: (brightness: number, noteIndex: number, phase?: Phase) => void,
  triggerClick: (note?: string, duration?: string) => void,
  frameTextureRef?: React.RefObject<THREE.CanvasTexture | null>,
}) {
  const blocksRef = useRef<THREE.InstancedMesh>(null)
  const radioRingRef = useRef<THREE.InstancedMesh>(null)
  const radioDotRef = useRef<THREE.InstancedMesh>(null)
  const dotsMeshRef = useRef<THREE.InstancedMesh>(null)
  const hlineMeshRef = useRef<THREE.InstancedMesh>(null)
  const vlineMeshRef = useRef<THREE.InstancedMesh>(null)
  const asciiMeshRef = useRef<THREE.InstancedMesh>(null)
  const pixelMeshRef = useRef<THREE.InstancedMesh>(null)
  const ribbonMeshRef = useRef<THREE.InstancedMesh>(null)
  const ditherMeshRef = useRef<THREE.Mesh>(null)
  
  const { resolution, threshold, extrusion, viewMode, theme, inverse, audioReactive, audioEnabled, renderMode, showGrid, ditherIntensity, moodEnabled, currentMood, currentPhase, handTracking, gestureTrackingStatus, frameSkip } = useStore()

  const frameCountRef = useRef(0)

  // Wrist-driven extrusion drift: `extrusion` (Leva slider) stays the base
  // value; when gesture tracking is active, wrist height adds a small drift
  // on top - same signal that drives the ambient glow in ThresholdView, now
  // also proving out on the volumetric depth. Proximity (how close the hand
  // is to the camera) multiplies the combined value, so reaching toward the
  // camera boosts the volumetric extrusion by up to 50%.
  const effectiveExtrusion = useMemo(() => {
    if (gestureTrackingStatus !== 'active') return extrusion
    const drift = wristYToExtrusionDrift(handTracking.wrist, handTracking.detected)
    return (extrusion + drift) * (1 + handTracking.proximity * PROXIMITY_EXTRUSION_BOOST)
  }, [extrusion, gestureTrackingStatus, handTracking.wrist, handTracking.detected, handTracking.proximity])

  const NOTES = useMemo(() => ['C2', 'E2', 'G2', 'A2', 'C3', 'E3', 'G3', 'A3', 'C4', 'E4', 'G4', 'A4'], [])
  
  const count = resolution * resolution
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const fftData = useMemo(() => new Uint8Array(64), [])
  const prevStates = useMemo(() => new Uint8Array(resolution * resolution), [resolution])

  // Per-row / per-column brightness accumulators for hline/vline modes
  // (reset each frame, written in the per-cell loop, consumed after).
  // Sized to the current resolution so the per-row/per-col loops index safely.
  const rowSumRef = useRef<Float32Array>(new Float32Array(resolution))
  const rowCountRef = useRef<Float32Array>(new Float32Array(resolution))
  const colSumRef = useRef<Float32Array>(new Float32Array(resolution))
  const colCountRef = useRef<Float32Array>(new Float32Array(resolution))

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
  // per-frame loop. hline/vline use `count = resolution` (one per row/col);
  // the rest use `count = resolution²`.
  const meshRefs = useMemo(
    () => [blocksRef, radioRingRef, radioDotRef, dotsMeshRef, hlineMeshRef, vlineMeshRef, asciiMeshRef, pixelMeshRef, ribbonMeshRef],
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
   }, [chromeColor, moodEnabled, currentPhase, theme, resolution, meshRefs, renderMode])

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

  // Per-instance glyph index for the ascii atlas (0..23 = 24 chars).
  // Sized to the instance count; values are written per-cell in useFrame
  // and the attribute is attached to the ascii mesh's plane geometry.
  const aGlyphIndex = useMemo(
    () => new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
    [count],
  )

  const asciiAtlas = useMemo(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 24 * 64  // 1536px for 24 glyphs at 64px each
    canvas.height = 64
    ctx.fillStyle = 'white'; ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    'MWNBDHK0@$#8X%+=-:;,._`"'.split('').forEach((char, i) => ctx.fillText(char, (i * 64) + 32, 32))
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
    const mat = new THREE.MeshStandardMaterial({ map: asciiAtlas, transparent: true, alphaTest: 0.2 })
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aGlyphIndex;')
        .replace(
          '#include <uv_vertex>',
          '#include <uv_vertex>\nvMapUv = vec2( ( vMapUv.x + aGlyphIndex ) / 24.0, vMapUv.y );',
        )
    }
    return mat
  }, [asciiAtlas])

  // Bayer-dithered hard-edged atlas for the `pixel` mode (moodboard reference:
  // rasterized / half-pixel-face look, NOT soft alpha-blended dots).
  const bayerPixelAtlas = useMemo(() => generateBayerDitherAtlas(8, 8), [])

  // Dither mode shader material — samples the live webcam canvas (wrapped as a
  // CanvasTexture by `useSampler`) and applies a Bayer-dithered halftone at the
  // fragment level. Hard-edged 8-level quantization (moodboard dither
  // reference). Reuses the existing "raw canvas → texture" bridge from hooks.ts
  // so it stays automatically in sync with the live feed.
  const ditherMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uFrame: { value: frameTextureRef?.current ?? null },
        uResolution: { value: new THREE.Vector2(resolution, resolution) },
        uLevels: { value: 6 },
      },
      vertexShader: bayerDitherVertexShader,
      fragmentShader: bayerDitherFragmentShader,
      depthTest: false,
      depthWrite: false,
    })
    return mat
  }, [frameTextureRef, resolution])

  useEffect(() => {
    return () => {
      ditherMaterial.dispose()
    }
  }, [ditherMaterial])

  const spacing = 0.25

useFrame((state) => {
    // rAF throttle: skip frames when thermal risk demands 30fps target.
    frameCountRef.current++
    if (frameCountRef.current % frameSkip !== 0) return

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

    // Push the live webcam frame texture into the dither shader uniform.
    // Done here (every frame) so the dither mode always reflects the latest
    // frame from `useSampler`, even when the texture ref isn't a state dep.
    if (frameTextureRef?.current && ditherMaterial.uniforms.uFrame.value !== frameTextureRef.current) {
      ditherMaterial.uniforms.uFrame.value = frameTextureRef.current
    }

    let audioIntensity = 0
    if (audioEnabled && analyzerRef.current) {
      const analyser = analyzerRef.current.analyser || analyzerRef.current
      if (analyser.getByteFrequencyData) {
        analyser.getByteFrequencyData(fftData)
        if (audioReactive) {
          let sum = 0
          for (let j = 0; j < 8; j++) sum += fftData[j]
          audioIntensity = (sum / 8) / 255
        }
      }
    }

    let clicksThisFrame = 0
    const MAX_CLICKS_PER_FRAME = 8

    // Per-cell color helper: only called inside mode guards so
    // getGradientColor runs once per cell (for the active mode) instead of
    // once per cell for every mode.
    const computeCellColor = (brightness: number) =>
      moodEnabled
        ? getMoodGradientColor(MOOD_CONFIGS[currentMood].baseHue, brightness, cellColorScratch)
        : getGradientColor(theme, brightness, cellColorScratch)

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
        const posY = (resolution / 2 - 0.5 - y) * spacing

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
          } else if (renderMode === 'hline' || renderMode === 'vline') {
            dummy.scale.set(spacing * s, spacing * s, 0.05)
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
          } else if (renderMode === 'hline' || renderMode === 'vline') {
            dummy.scale.set(spacing * s, spacing * s, modeZ * 0.95)
          } else {
            dummy.scale.set(spacing * 0.9, spacing * 0.9, modeZ)
          }
        }
        
        dummy.updateMatrix()
        
        // Per-cell diffuse color — only compute for the active mode's mesh.
        // getGradientColor is invoked inside each mode guard so it never runs
        // for cells whose mode won't consume the result.
        if (renderMode === 'blocks' && blocksRef.current) blocksRef.current.setColorAt(id, computeCellColor(brightness))
        if (renderMode === 'pixel' && pixelMeshRef.current) pixelMeshRef.current.setColorAt(id, computeCellColor(brightness))
        if (renderMode === 'dots' && dotsMeshRef.current) dotsMeshRef.current.setColorAt(id, computeCellColor(brightness))
        if (renderMode === 'hline' && hlineMeshRef.current) hlineMeshRef.current.setColorAt(y, computeCellColor(brightness))
        if (renderMode === 'vline' && vlineMeshRef.current) vlineMeshRef.current.setColorAt(x, computeCellColor(brightness))

        if (renderMode === 'ascii') {
          // Atlas order is dense-to-sparse (24 glyphs): 'MWNBDHK0@$#8X%+=-:;,._'` "'
          // brightness 1 → idx 0 ('M'), brightness 0 → idx 23 ('"').
          const glyphIdx = Math.floor((1 - brightness) * 23)
          aGlyphIndex.array[id] = glyphIdx
        }

        if (renderMode === 'blocks' && blocksRef.current) blocksRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'pixel' && pixelMeshRef.current) pixelMeshRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'ascii' && asciiMeshRef.current) asciiMeshRef.current.setMatrixAt(id, dummy.matrix)
        if (renderMode === 'dots' && dotsMeshRef.current) dotsMeshRef.current.setMatrixAt(id, dummy.matrix)

        // hline/vline: track the per-row / per-column mean brightness inside the
        // per-cell loop, then write one instance per row/col AFTER the loop ends.
        if (renderMode === 'hline' || renderMode === 'vline') {
          rowSumRef.current[y] += brightness
          rowCountRef.current[y] += 1
          colSumRef.current[x] += brightness
          colCountRef.current[x] += 1
        }

        // Ribbon: spectrum-analyzer bars. Each column = one FFT bin, bar height
        // = bin magnitude. Reads as a real audio spectrum, not just sin waves.
        if (renderMode === 'ribbon' && ribbonMeshRef.current && fftData) {
          const binIdx = Math.min(63, Math.floor((x / resolution) * 64))
          const binValue = fftData[binIdx] / 255
          const barHeight = binValue * effectiveExtrusion * 2
          dummy.position.set(posX, posY, finalZ + barHeight / 2)
          dummy.scale.set(spacing * 0.8, spacing * 0.8, Math.max(0.05, barHeight))
          dummy.rotation.set(0, 0, 0)
          dummy.updateMatrix()
          ribbonMeshRef.current.setMatrixAt(id, dummy.matrix)
          const ribbonColor = moodEnabled
            ? getMoodGradientColor(MOOD_CONFIGS[currentMood].baseHue, binValue, cellColorScratch)
            : getGradientColor(theme, binValue, cellColorScratch)
          ribbonMeshRef.current.setColorAt(id, ribbonColor)
        }

        // Radio: literal-button look. Outer ring (constant), inner filled dot
        // scaled from 0..full as brightness rises — reads as a pressed/unpressed
        // UI radio button per cell.
        if (renderMode === 'radio') {
          const cellColor = computeCellColor(brightness)
          if (radioRingRef.current) {
            dummy.position.set(posX, posY, finalZ)
            dummy.scale.set(spacing * 0.7, spacing * 0.7, 1)
            dummy.rotation.set(0, 0, 0)
            dummy.updateMatrix()
            radioRingRef.current.setMatrixAt(id, dummy.matrix)
            if (cellColor) radioRingRef.current.setColorAt(id, cellColor)
          }
          if (radioDotRef.current) {
            const dotScale = Math.max(0, Math.min(1, brightness)) * spacing * 0.55
            dummy.position.set(posX, posY, finalZ + 0.01)
            dummy.scale.set(dotScale, dotScale, 1)
            dummy.updateMatrix()
            radioDotRef.current.setMatrixAt(id, dummy.matrix)
            if (cellColor) radioDotRef.current.setColorAt(id, cellColor)
          }
        }
      }
    }
    
    if (renderMode === 'ascii') {
      aGlyphIndex.needsUpdate = true
    }
    if (renderMode === 'ribbon' && ribbonMeshRef.current) {
      ribbonMeshRef.current.instanceMatrix.needsUpdate = true
      if (ribbonMeshRef.current.instanceColor) ribbonMeshRef.current.instanceColor.needsUpdate = true
    }

    // hline: one instance per row, full-width, scaled to row mean brightness.
    // Brightness dramatically affects thickness (0.2..1.5x spacing) so active
    // rows stand out as thick bright lines vs inactive rows as thin dim lines.
    if (renderMode === 'hline' && hlineMeshRef.current) {
      const fullWidth = resolution * spacing
      for (let y = 0; y < resolution; y++) {
        const mean = rowCountRef.current[y] ? rowSumRef.current[y] / rowCountRef.current[y] : 0
        const rowPosY = (resolution / 2 - 0.5 - y) * spacing
        const thickness = spacing * (0.2 + mean * 1.3)
        dummy.position.set(0, rowPosY, 0)
        dummy.scale.set(fullWidth, thickness, 1)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        hlineMeshRef.current.setMatrixAt(y, dummy.matrix)
      }
      hlineMeshRef.current.instanceMatrix.needsUpdate = true
    }
    // vline: one instance per column, full-height, scaled to column mean brightness.
    if (renderMode === 'vline' && vlineMeshRef.current) {
      const fullHeight = resolution * spacing
      for (let x = 0; x < resolution; x++) {
        const mean = colCountRef.current[x] ? colSumRef.current[x] / colCountRef.current[x] : 0
        const colPosX = (x - resolution / 2 + 0.5) * spacing
        const thickness = spacing * (0.2 + mean * 1.3)
        dummy.position.set(colPosX, 0, 0)
        dummy.scale.set(thickness, fullHeight, 1)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        vlineMeshRef.current.setMatrixAt(x, dummy.matrix)
      }
      vlineMeshRef.current.instanceMatrix.needsUpdate = true
    }
    // Reset the per-frame accumulators so the next frame starts fresh.
    if (renderMode === 'hline' || renderMode === 'vline') {
      rowSumRef.current.fill(0); rowCountRef.current.fill(0)
      colSumRef.current.fill(0); colCountRef.current.fill(0)
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
    let activeRef: React.RefObject<THREE.InstancedMesh | null> | undefined
    switch (renderMode) {
      case 'blocks': activeRef = blocksRef; break
      case 'radio': activeRef = radioRingRef; break
      case 'pixel': activeRef = pixelMeshRef; break
      case 'dots': activeRef = dotsMeshRef; break
      case 'hline': activeRef = hlineMeshRef; break
      case 'vline': activeRef = vlineMeshRef; break
      case 'ascii': activeRef = asciiMeshRef; break
      case 'ribbon': activeRef = ribbonMeshRef; break
    }

    if (activeRef?.current) {
      const mesh = activeRef.current
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        const flickered = Math.max(0, baseEmissive * (1 + flicker))
        mesh.material.emissiveIntensity = moodEnabled ? flickered * emissiveScale * breathMultiplier : flickered
      }
      mesh.instanceMatrix.needsUpdate = true
    }
    if (renderMode === 'radio' && radioDotRef.current) {
      const mesh = radioDotRef.current
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.instanceMatrix.needsUpdate = true
    }
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


      {(() => {
        switch (renderMode) {
          case 'blocks':
            return (
              <instancedMesh key={`blocks-${resolution}`} ref={blocksRef} args={[null as any, null as any, count]} visible>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#ffffff" map={halftoneDotAtlas} emissive={chromeColor} roughness={0.4} metalness={0.6} />
              </instancedMesh>
            )
          case 'radio':
            return (
              <>
                <instancedMesh key={`radio-ring-${resolution}`} ref={radioRingRef} args={[null as any, null as any, count]} visible>
                  <torusGeometry args={[0.5, 0.05, 16, 32]} />
                  <meshStandardMaterial color="#ffffff" map={ditherAtlas} emissive={chromeColor} emissiveIntensity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
                </instancedMesh>
                <instancedMesh key={`radio-dot-${resolution}`} ref={radioDotRef} args={[null as any, null as any, count]} visible>
                  <circleGeometry args={[0.5, 32]} />
                  <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
                </instancedMesh>
              </>
            )
          case 'pixel':
            return (
              <instancedMesh key={`pixel-${resolution}`} ref={pixelMeshRef} args={[null as any, null as any, count]} visible>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#ffffff" map={bayerPixelAtlas} transparent alphaTest={0.1} />
              </instancedMesh>
            )
          case 'dots':
            return (
              <instancedMesh key={`dots-${resolution}`} ref={dotsMeshRef} args={[null as any, null as any, count]} visible>
                <sphereGeometry args={[1, 8, 8]} />
                <meshStandardMaterial color="#ffffff" emissive={chromeColor} roughness={0.1} metalness={0.8} alphaMap={ditherAtlas} transparent />
              </instancedMesh>
            )
          case 'hline':
            return (
              <instancedMesh key={`hline-${resolution}`} ref={hlineMeshRef} args={[null as any, null as any, resolution]} visible>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial color="#ffffff" emissive={chromeColor} emissiveIntensity={2} alphaMap={ditherAtlas} transparent />
              </instancedMesh>
            )
          case 'vline':
            return (
              <instancedMesh key={`vline-${resolution}`} ref={vlineMeshRef} args={[null as any, null as any, resolution]} visible>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial color="#ffffff" emissive={chromeColor} emissiveIntensity={2} alphaMap={ditherAtlas} transparent />
              </instancedMesh>
            )
          case 'ascii':
            return (
              <instancedMesh key={`ascii-${resolution}`} ref={asciiMeshRef} args={[null as any, null as any, count]} visible>
                <planeGeometry args={[1, 1]}>
                  <primitive object={aGlyphIndex} attach="attributes-aGlyphIndex" />
                </planeGeometry>
                <primitive object={asciiMaterial} attach="material" />
              </instancedMesh>
            )
          case 'ribbon':
            return (
              <instancedMesh key={`ribbon-${resolution}`} ref={ribbonMeshRef} args={[null as any, null as any, count]} visible>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#ffffff" emissive={chromeColor} emissiveIntensity={2} alphaMap={ditherAtlas} transparent />
              </instancedMesh>
            )
          case 'dither':
            return (
              <mesh ref={ditherMeshRef} visible frustumCulled={false} renderOrder={-1}>
                <planeGeometry args={[2, 2]} />
                <primitive object={ditherMaterial} attach="material" />
              </mesh>
            )
          default:
            return null
        }
      })()}
    </>
  )
}
