# Threshold v4 — Manual Test Plan

## Prerequisites
1. `npm run dev` → Open `http://localhost:3000/musings/experiments/threshold/`
2. Allow webcam access
3. Click INITIALIZE (wait for Depth Anything V2 model to load)

## Test 1: Jazz Hands Gesture
1. Make jazz hands pose (both hands open, fingers spread, palms facing camera)
2. Wait 1-2 seconds
3. **Expected:**
   - Console log: "AI Composer experience composed" with glitch controls
   - Leva panel shows "AI Composer" folder with current gesture info
   - Scene emissive intensity increases (glitch effect on rendered meshes)
   - Audio swaps to FMSynth with chimes sound
   - Glitch intensity, chromatic aberration, particle count controls visible

## Test 2: Peace Sign Gesture
1. Make peace sign (2 fingers up, hand facing camera)
2. Wait 1-2 seconds
3. **Expected:**
   - Console log with bloom controls
   - Scene emissive intensity shifts to bloom mode
   - Audio swaps to AMSynth with bells sound
   - Extrusion depth, bloom intensity, spectral mode controls

## Test 3: Fist Pump Gesture
1. Make fist (hand closed, palm facing camera)
2. Wait 1-2 seconds
3. **Expected:**
   - Console log with bass controls
   - Scene emissive intensity shifts to bass pulse mode
   - Audio swaps to MonoSynth with pulse sound
   - Beat frequency, bass boost, kick pattern controls

## Test 4: Performance Check
1. Open Chrome DevTools → Performance tab
2. Record 10 seconds while making gestures
3. **Expected:**
   - FPS stays at 60 (R3F render)
   - Webcam runs at 30fps
   - No frame drops during Leva panel updates
   - Shader compilation < 16ms (check worker messages)

## Test 5: Gesture Debouncing
1. Make jazz hands → wait for experience to load
2. Immediately switch to peace sign
3. **Expected:** Experience runs 5-10 seconds before accepting new input
   (Debouncing is future work — for now, switch is immediate)