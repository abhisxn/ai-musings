// Web Worker for pixel-based gesture detection from webcam ImageBitmap
// No external dependencies — uses OffscreenCanvas pixel analysis

function hsvToHue(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return -1
  let hue
  const d = max - min
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60
  else if (max === g) hue = ((b - r) / d + 2) * 60
  else hue = ((r - g) / d + 4) * 60
  return hue
}

function isSkinColor(r, g, b) {
  const h = hsvToHue(r, g, b)
  // Skin tones typically fall in 0-50 hue range
  return h >= 0 && h <= 50 && r > 60 && g > 30 && b > 20
}

function analyzeImageData(data, width, height) {
  let skinPixels = 0
  let totalPixels = data.length / 4

  // Divide the frame into 4x4 grid regions
  const gridCols = 4
  const gridRows = 4
  const regions = new Array(gridCols * gridRows).fill(0)
  const regionSizeX = Math.floor(width / gridCols)
  const regionSizeY = Math.floor(height / gridRows)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx], g = data[idx + 1], b = data[idx + 2]
      if (isSkinColor(r, g, b)) {
        skinPixels++
        const gridX = Math.min(Math.floor(x / regionSizeX), gridCols - 1)
        const gridY = Math.min(Math.floor(y / regionSizeY), gridRows - 1)
        regions[gridY * gridCols + gridX]++
      }
    }
  }

  const skinRatio = skinPixels / totalPixels

  // Count how many regions have significant skin content
  const activeRegions = regions.filter(v => v > regionSizeX * regionSizeY * 0.05).length

  // Calculate spread: how many adjacent region pairs differ
  let transitions = 0
  for (let i = 0; i < regions.length - 1; i++) {
    const active = regions[i] > regionSizeX * regionSizeY * 0.05 ? 1 : 0
    const nextActive = regions[i + 1] > regionSizeX * regionSizeY * 0.05 ? 1 : 0
    if (active !== nextActive) transitions++
  }

  return { skinRatio, activeRegions, transitions, regionData: regions }
}

function detectGesture(analysis) {
  const { skinRatio, activeRegions, transitions } = analysis

  // Jazz hands: lots of skin, many active regions, high transitions (fingers spread)
  if (skinRatio > 0.15 && activeRegions >= 6 && transitions > 4) {
    return { gesture: 'jazz-hands', confidence: Math.min(1, skinRatio * 3) }
  }

  // Peace sign: moderate skin, 3-5 active regions (two fingers + palm)
  if (skinRatio > 0.08 && activeRegions >= 3 && activeRegions <= 5 && transitions <= 4) {
    return { gesture: 'peace-sign', confidence: Math.min(1, skinRatio * 4) }
  }

  // Fist pump: low to moderate skin, concentrated in few regions
  if (skinRatio > 0.05 && activeRegions <= 3 && transitions <= 2) {
    return { gesture: 'fist-pump', confidence: Math.min(1, skinRatio * 5) }
  }

  return null
}

self.onmessage = async (event) => {
  const { type, imageBitmap } = event.data

  if (type === 'INIT') {
    self.postMessage({ type: 'INIT_DONE' })
    return
  }

  if (type === 'DETECT' && imageBitmap) {
    try {
      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(imageBitmap, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      const analysis = analyzeImageData(imageData.data, canvas.width, canvas.height)
      const result = detectGesture(analysis)

      self.postMessage({
        type: 'POSE_RESULTS',
        gesture: result ? result.gesture : null,
        confidence: result ? result.confidence : 0,
        analysis: { skinRatio: analysis.skinRatio, activeRegions: analysis.activeRegions },
        timestamp: Date.now()
      })
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message })
    }
    return
  }
}