import * as THREE from 'three'

export function bayerMatrix(n: number): number[][] {
  if (n < 1) throw new Error('bayerMatrix requires n >= 1')
  const size = 1 << n
  if (n === 1) {
    return [[0, 2], [3, 1]]
  }
  const prev = bayerMatrix(n - 1)
  const half = size / 2
  const m: number[][] = []
  for (let y = 0; y < size; y++) {
    m.push(new Array(size).fill(0))
  }
  for (let y = 0; y < half; y++) {
    for (let x = 0; x < half; x++) {
      const base = 4 * prev[y][x]
      m[y][x] = base
      m[y][x + half] = base + 2
      m[y + half][x] = base + 3
      m[y + half][x + half] = base + 1
    }
  }
  return m
}

export function generateDitherAtlas(order: 2 | 3 | 4 = 4): THREE.CanvasTexture {
  const matrix = bayerMatrix(order)
  const size = matrix.length
  const cell = 4
  const canvas = document.createElement('canvas')
  canvas.width = size * cell
  canvas.height = size * cell
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const max = size * size - 1
  ctx.fillStyle = 'white'
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const threshold = matrix[y][x] / max
      const filled = 1 - threshold
      const dot = Math.round(filled * cell)
      if (dot > 0) {
        const px = x * cell + (cell - dot) / 2
        const py = y * cell + (cell - dot) / 2
        ctx.fillRect(px, py, dot, dot)
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = texture.magFilter = THREE.NearestFilter
  return texture
}

export function generateHalftoneDotAtlas(size: number = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, size, size)
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.6)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

export function generateSpectralSprite(size: number = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

// Returns a hard-edged Bayer-quantized atlas: each pixel is one of K discrete
// gray levels (no anti-aliasing, no fade-to-edge softening). Used by the
// `pixel` render mode to look like a rasterized bitmap portrait (moodboard
// reference) rather than soft alpha-blended dots.
export function generateBayerDitherAtlas(size: number, levels: number = 8): THREE.CanvasTexture {
  const matrix = bayerMatrix(size)
  const tileSize = matrix.length
  const canvas = document.createElement('canvas')
  canvas.width = tileSize
  canvas.height = tileSize
  const ctx = canvas.getContext('2d')!
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const v = (matrix[y][x] + 0.5) / (tileSize * tileSize)
      const level = Math.floor(v * levels)
      const gray = Math.round((level / Math.max(1, levels - 1)) * 255)
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`
      ctx.fillRect(x, y, 1, 1)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = texture.magFilter = THREE.NearestFilter
  return texture
}
