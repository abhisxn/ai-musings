export function generateBlueNoiseTexture(size: number): Uint8Array {
  const tex = new Uint8Array(size * size)
  const seed = 12345
  let rng = seed
  for (let i = 0; i < size * size; i++) {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    tex[i] = rng & 0xff
  }
  for (let iter = 0; iter < 3; iter++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = y * size + x
        let sum = 0
        let count = 0
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = (x + dx + size) % size
            const ny = (y + dy + size) % size
            sum += tex[ny * size + nx]
            count++
          }
        }
        const localAvg = sum / count
        tex[idx] = Math.min(255, Math.max(0, Math.round(tex[idx] * 0.3 + (255 - localAvg) * 0.7)))
      }
    }
  }
  return tex
}
