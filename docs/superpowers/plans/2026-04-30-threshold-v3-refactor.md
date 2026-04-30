# THRESHOLD V3 (Volumetric Terminal Instrument) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Threshold experiment into a high-performance R3F volumetric instrument with locked 2D/3D states and audio-reactive voxel extrusion.

**Architecture:** 
- Use a `VideoTexture` + `OffscreenCanvas` sampling pipeline to offload pixel processing from the main thread.
- Implement an `InstancedMesh` of voxels (boxes) in R3F.
- Animate camera states (Flat vs. Volumetric) using `framer-motion-3d`.
- Couple Tone.js FFT and threshold triggers to visual extrusion and emissive intensity.

**Tech Stack:** React 19, Three.js, R3F, Zustand, Tone.js, framer-motion-3d, Leva.

---

### Task 1: Update Store State

**Files:**
- Modify: `experiments/threshold/store.ts`

- [ ] **Step 1: Update `ThresholdState` interface**
Add `viewMode`, `audioReactive`, and update `setters`.

```typescript
interface ThresholdState {
  initialized: boolean
  setInitialized: (val: boolean) => void
  videoElement: HTMLVideoElement | null
  setVideoElement: (el: HTMLVideoElement | null) => void
  resolution: number
  setResolution: (val: number) => void
  threshold: number
  setThreshold: (val: number) => void
  extrusion: number
  setExtrusion: (val: number) => void
  inverse: boolean
  setInverse: (val: boolean) => void
  viewMode: 'flat' | 'volumetric'
  setViewMode: (val: 'flat' | 'volumetric') => void
  renderMode: 'radio' | 'dots' | 'blocks' | 'particles' | 'ascii'
  setRenderMode: (val: 'radio' | 'dots' | 'blocks' | 'particles' | 'ascii') => void
  theme: 'dark' | 'light' | 'acid' | 'heatmap'
  setTheme: (val: 'dark' | 'light' | 'acid' | 'heatmap') => void
  sourceMode: 'pixel' | 'ai'
  setSourceMode: (val: 'pixel' | 'ai') => void
  audioEnabled: boolean
  setAudioEnabled: (val: boolean) => void
  audioReactive: boolean
  setAudioReactive: (val: boolean) => void
  soundType: 'sine' | 'chimes' | 'bells' | 'pulse'
  setSoundType: (val: 'sine' | 'chimes' | 'bells' | 'pulse') => void
  volume: number
  setVolume: (val: number) => void
}
```

- [ ] **Step 2: Implement initial state and setters**

```typescript
export const useStore = create<ThresholdState>((set) => ({
  initialized: false,
  setInitialized: (initialized) => set({ initialized }),
  videoElement: null,
  setVideoElement: (videoElement) => set({ videoElement }),
  resolution: 64,
  setResolution: (resolution) => set({ resolution }),
  threshold: 0.5,
  setThreshold: (threshold) => set({ threshold }),
  extrusion: 3.0,
  setExtrusion: (extrusion) => set({ extrusion }),
  inverse: false,
  setInverse: (inverse) => set({ inverse }),
  viewMode: 'flat',
  setViewMode: (viewMode) => set({ viewMode }),
  renderMode: 'radio',
  setRenderMode: (renderMode) => set({ renderMode }),
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  sourceMode: 'pixel',
  setSourceMode: (sourceMode) => set({ sourceMode }),
  audioEnabled: false,
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  audioReactive: true,
  setAudioReactive: (audioReactive) => set({ audioReactive }),
  soundType: 'chimes',
  setSoundType: (soundType) => set({ soundType }),
  volume: -12,
  setVolume: (volume) => set({ volume }),
}))
```

- [ ] **Step 3: Commit**
`git commit -m "chore: update threshold store state"`

---

### Task 2: Optimized Sampler Hook

**Files:**
- Modify: `experiments/threshold/hooks.ts`

- [ ] **Step 1: Refactor `useSampler` to use `OffscreenCanvas`**
Implement the efficient sampling loop using a hidden canvas and `Float32Array`.

```typescript
export function useSampler() {
  const initialized = useStore(state => state.initialized)
  const videoElement = useStore(state => state.videoElement)
  const resolution = useStore(state => state.resolution)
  const sourceMode = useStore(state => state.sourceMode)
  
  const dataRef = useRef<Float32Array>(new Float32Array(128 * 128))
  const samplerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const aiModelRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)

  // 1. AI Setup
  useEffect(() => {
    if (!initialized || sourceMode !== 'ai') return
    async function loadAI() {
      setLoading(true)
      try {
        const { pipeline } = await import('@xenova/transformers')
        aiModelRef.current = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf')
      } catch (err) { console.error("AI Load Error:", err) }
      finally { setLoading(false) }
    }
    loadAI()
  }, [initialized, sourceMode])

  // 2. Main Sampling Loop
  useEffect(() => {
    if (!videoElement || !initialized) return
    
    if (!samplerCanvasRef.current) {
      samplerCanvasRef.current = document.createElement('canvas')
      samplerCanvasRef.current.width = 128
      samplerCanvasRef.current.height = 128
    }
    const ctx = samplerCanvasRef.current.getContext('2d', { willReadFrequently: true })!
    
    let frameId: number
    const process = async () => {
      if (videoElement.readyState >= 2) {
        ctx.drawImage(videoElement, 0, 0, 128, 128)
        const imageData = ctx.getImageData(0, 0, 128, 128)
        
        if (sourceMode === 'ai' && aiModelRef.current) {
          const { RawImage } = await import('@xenova/transformers')
          const image = new RawImage(imageData.data, 128, 128, 4)
          const result = await aiModelRef.current(image)
          const depthData = result.depth.data
          for (let i = 0; i < resolution * resolution; i++) {
            dataRef.current[i] = depthData[i] / 255
          }
        } else {
          for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
              const px = Math.floor((x / resolution) * 128)
              const py = Math.floor((y / resolution) * 128)
              const idx = (py * 128 + px) * 4
              const r = imageData.data[idx], g = imageData.data[idx + 1], b = imageData.data[idx + 2]
              dataRef.current[y * resolution + x] = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            }
          }
        }
      }
      frameId = requestAnimationFrame(process)
    }
    process()
    return () => cancelAnimationFrame(frameId)
  }, [videoElement, resolution, sourceMode, initialized])

  return { loading, dataRef }
}
```

- [ ] **Step 2: Commit**
`git commit -m "feat: refactor sampler hook for performance"`

---

### Task 3: Voxel Scene with InstancedMesh

**Files:**
- Modify: `experiments/threshold/Scene.tsx`

- [ ] **Step 1: Implement Voxel InstancedMesh**
Use `boxGeometry` and update matrices in `useFrame`. Use `dataRef` correctly.

```typescript
export function Scene({ 
  depthDataRef, 
  analyzerRef 
}: { 
  depthDataRef: React.RefObject<Float32Array>,
  analyzerRef: React.RefObject<any> 
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { resolution, extrusion, threshold, theme, inverse, audioReactive, viewMode } = useStore()
  
  const count = resolution * resolution
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const fftData = useMemo(() => new Uint8Array(64), [])

  const color = useMemo(() => {
    if (theme === 'acid') return '#ccff00'
    if (theme === 'light') return '#ffffff'
    if (theme === 'heatmap') return '#ff003c'
    return '#00ff41'
  }, [theme])

  useFrame((state) => {
    if (!meshRef.current || !depthDataRef.current) return

    let audioIntensity = 0
    if (audioReactive && analyzerRef.current) {
      analyzerRef.current.getValue(fftData)
      let sum = 0; for (let j = 0; j < 8; j++) sum += fftData[j]
      audioIntensity = (sum / 8) / 255
    }

    let i = 0
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const id = i++
        let brightness = depthDataRef.current[y * resolution + x] || 0
        if (inverse) brightness = 1.0 - brightness

        const isActive = brightness > threshold
        const zExtrusion = isActive ? (brightness * extrusion) : 0.1
        const audioHeight = isActive ? (audioIntensity * extrusion * 2) : 0
        
        const finalZ = zExtrusion + audioHeight
        
        // Grid spacing
        const spacing = 0.25
        dummy.position.set(
          ((resolution - x) - resolution / 2) * spacing, 
          (y - resolution / 2) * -spacing, 
          viewMode === 'flat' ? 0 : finalZ / 2
        )
        
        dummy.scale.set(spacing * 0.9, spacing * 0.9, viewMode === 'flat' ? 0.05 : Math.max(0.1, finalZ))
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(id, dummy.matrix)
      }
    }
    
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.emissiveIntensity = (theme === 'dark' ? 1 : 0.5) + (audioIntensity * 10)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} emissive={color} roughness={0.2} metalness={0.8} />
    </instancedMesh>
  )
}
```

- [ ] **Step 2: Commit**
`git commit -m "feat: implement volumetric voxel scene"`

---

### Task 4: Camera State Animation

**Files:**
- Modify: `experiments/threshold/index.tsx`

- [ ] **Step 1: Add Camera animation and Toggle shortcut**
Use `useFrame` or a separate effect to animate camera position based on `viewMode`.

```typescript
function AnimatedCamera() {
  const viewMode = useStore(state => state.viewMode)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  useFrame((state, delta) => {
    if (!cameraRef.current) return
    const targetPos = viewMode === 'flat' ? [0, 0, 15] : [10, -10, 15]
    const targetLookAt = new THREE.Vector3(0, 0, 0)
    
    cameraRef.current.position.lerp(new THREE.Vector3(...targetPos), 0.1)
    cameraRef.current.lookAt(targetLookAt)
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={50} />
}
```

- [ ] **Step 2: Update `ThresholdExperiment` to include shortcut**

```typescript
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setViewMode(viewMode === 'flat' ? 'volumetric' : 'flat')
    }
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [viewMode, setViewMode])
```

- [ ] **Step 3: Commit**
`git commit -m "feat: add camera state animation and toggle shortcut"`

---

### Task 5: Audio Engine Clicks

**Files:**
- Modify: `experiments/threshold/audio.ts`
- Modify: `experiments/threshold/Scene.tsx`

- [ ] **Step 1: Add percussive synth for clicks**

```typescript
// audio.ts
const clickSynthRef = useRef<Tone.PolySynth | null>(null)
// Inside useEffect:
clickSynthRef.current = new Tone.PolySynth(Tone.MembraneSynth, {
  pitchDecay: 0.008,
  octaves: 2,
  envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 }
}).toDestination()
```

- [ ] **Step 2: Trigger clicks in Scene's `useFrame`**
Track `prevStates` to trigger on threshold crossing.

```typescript
// Scene.tsx
const prevStates = useRef<boolean[]>([])
// Inside useFrame:
if (shouldCheck !== prevStates.current[id]) {
  if (shouldCheck && clickSynthRef.current) {
    clickSynthRef.current.triggerAttackRelease("C2", "32n")
  }
  prevStates.current[id] = shouldCheck
}
```

- [ ] **Step 3: Commit**
`git commit -m "feat: add mechanical click audio feedback"`

---

### Task 6: Final Integration & Cleanup

**Files:**
- Modify: `experiments/threshold/index.tsx`
- Remove: `experiments/threshold/threshold-v2.html` (if desired)

- [ ] **Step 1: Clean up post-processing and Leva controls**
Ensure all controls match the spec.

- [ ] **Step 2: Final verification of 2D/3D toggle and audio reactivity**

- [ ] **Step 3: Commit**
`git commit -m "feat: final integration and cleanup of Threshold V3"`
