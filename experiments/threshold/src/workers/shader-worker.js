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

function compileShader(type, source) {
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

function linkProgram(vs, fs) {
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

const DEFAULT_VERTEX_SRC = `
  attribute vec4 aPosition;
  void main() {
    gl_Position = aPosition;
  }
`

const DEFAULT_FRAGMENT_SRC = `
  precision highp float;
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`

self.onmessage = (event) => {
  const { type, shaderCode, vertexCode, uniforms } = event.data

  if (type === 'INIT') {
    try {
      const ctx = getGL()
      self.postMessage({ type: 'INIT_DONE', hasWebGL: !!ctx })
    } catch (err) {
      self.postMessage({ type: 'INIT_ERROR', error: err.message })
    }
    return
  }

  if (type === 'COMPILE_GLSL') {
    const startTime = performance.now()
    try {
      const ctx = getGL()
      if (!ctx) throw new Error('WebGL not available in OffscreenCanvas')

      const vs = compileShader('vertex', vertexCode || DEFAULT_VERTEX_SRC)
      const fs = compileShader('fragment', shaderCode || DEFAULT_FRAGMENT_SRC)
      const program = linkProgram(vs, fs)

      const compileTime = performance.now() - startTime

      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteProgram(program)

      self.postMessage({
        type: 'COMPILE_SUCCESS',
        compileTime,
        timestamp: Date.now()
      })
    } catch (err) {
      const compileTime = performance.now() - startTime
      self.postMessage({ type: 'COMPILE_ERROR', error: err.message, compileTime })
    }
  }
}