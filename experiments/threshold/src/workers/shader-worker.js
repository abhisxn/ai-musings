// Uses OffscreenCanvas API for shader compilation off main thread (<16ms target)

let gl = null
let canvas = null

function getGL() {
  if (!gl) {
    canvas = new OffscreenCanvas(64, 64)
    gl = canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true })
  }
  return gl
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type === 'vertex' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error('Shader compile error: ' + info)
  }
  return shader
}

function linkProgram(gl, vs, fs) {
  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error('Program link error: ' + info)
  }
  return program
}

const VERTEX_SHADER_SRC = `
  attribute vec4 aPosition;
  void main() {
    gl_Position = aPosition;
  }
`

self.onmessage = (event) => {
  const { type, shaderCode, uniforms } = event.data

  if (type === 'INIT') {
    try {
      const ctx = getGL()
      self.postMessage({ type: 'INIT_DONE', hasWebGL: !!ctx })
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message })
    }
    return
  }

  if (type === 'COMPILE_GLSL') {
    const startTime = performance.now()
    try {
      const ctx = getGL()
      if (!ctx) throw new Error('WebGL not available in OffscreenCanvas')

      const vs = compileShader(ctx, 'vertex', VERTEX_SHADER_SRC)
      const fs = compileShader(ctx, 'fragment', shaderCode || `
        precision highp float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `)
      const program = linkProgram(ctx, vs, fs)

      const compileTime = performance.now() - startTime

      self.postMessage({
        type: 'COMPILE_SUCCESS',
        programId: program.id || String(Math.random()),
        compileTime,
        timestamp: Date.now()
      })

      ctx.deleteShader(vs)
      ctx.deleteShader(fs)
      ctx.deleteProgram(program)
    } catch (err) {
      self.postMessage({ type: 'COMPILE_ERROR', error: err.message, compileTime: performance.now() - startTime })
    }
  }
}
