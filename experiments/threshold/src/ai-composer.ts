import { GestureType, HallucinatedControl } from './types'
import { useStore } from './store'

export class AIComposer {
  private store = useStore

  composeExperience(gesture: GestureType): {
    hallucinatedControls: HallucinatedControl[]
    shaderCode: string | null
    audioProfile: string | null
  } {
    switch (gesture) {
      case 'jazz-hands':
        return this.composeJazzHands()
      case 'peace-sign':
        return this.composePeaceSign()
      case 'fist-pump':
        return this.composeFistPump()
      default:
        return { hallucinatedControls: [], shaderCode: null, audioProfile: null }
    }
  }

  private composeJazzHands() {
    const controls: HallucinatedControl[] = [
      { id: 'glitch-intensity', label: 'Glitch Intensity', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
      { id: 'chromatic-aberration', label: 'Chromatic Aberration', min: 0, max: 0.01, step: 0.001, defaultValue: 0.005 },
      { id: 'particle-count', label: 'Particle Count', min: 1000, max: 100000, step: 1000, defaultValue: 10000 }
    ]

    const shader = this.generateGlitchShader()

    this.store.getState().spawnHallucinatedControls(controls)
    this.store.getState().setCurrentShader(shader)
    this.store.getState().setAudioProfile('chimes')

    return { hallucinatedControls: controls, shaderCode: shader, audioProfile: 'chimes' }
  }

  private composePeaceSign() {
    const controls: HallucinatedControl[] = [
      { id: 'extrusion-depth', label: 'Extrusion Depth', min: 0, max: 20, step: 0.1, defaultValue: 3.0 },
      { id: 'bloom-intensity', label: 'Bloom Intensity', min: 0, max: 2, step: 0.05, defaultValue: 0.8 },
      { id: 'spectral-mode', label: 'Spectral Mode', min: 0, max: 1, step: 0.01, defaultValue: 0.5 }
    ]

    const shader = this.generateBloomShader()

    this.store.getState().spawnHallucinatedControls(controls)
    this.store.getState().setCurrentShader(shader)
    this.store.getState().setAudioProfile('bells')

    return { hallucinatedControls: controls, shaderCode: shader, audioProfile: 'bells' }
  }

  private composeFistPump() {
    const controls: HallucinatedControl[] = [
      { id: 'beat-frequency', label: 'Beat Frequency', min: 0, max: 10, step: 0.1, defaultValue: 1.0 },
      { id: 'bass-boost', label: 'Bass Boost', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
      { id: 'kick-pattern', label: 'Kick Pattern', min: 0, max: 1, step: 0.01, defaultValue: 0.3 }
    ]

    const shader = this.generateBassShader()

    this.store.getState().spawnHallucinatedControls(controls)
    this.store.getState().setCurrentShader(shader)
    this.store.getState().setAudioProfile('pulse')

    return { hallucinatedControls: controls, shaderCode: shader, audioProfile: 'pulse' }
  }

  private generateGlitchShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uGlitchIntensity;
      uniform float uChromaticAberration;
      uniform float uParticleCount;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float glitch = step(0.98, sin(uv.y * 100.0 + uTime * 10.0) * uGlitchIntensity);
        uv.x += glitch * 0.05 * uGlitchIntensity;
        float r = texture2D(uTexture, uv + vec2(uChromaticAberration, 0.0)).r;
        float g = texture2D(uTexture, uv).g;
        float b = texture2D(uTexture, uv - vec2(uChromaticAberration, 0.0)).b;
        float particles = step(0.5, sin(uv.x * uParticleCount + uv.y * uParticleCount + uTime));
        gl_FragColor = vec4(r + particles * 0.2, g, b, 1.0);
      }
    `
  }

  private generateBloomShader(): string {
    return `
      precision highp float;
      uniform sampler2D uDepthMap;
      uniform float uExtrusionDepth;
      uniform float uBloomIntensity;
      uniform float uSpectralMode;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float depth = texture2D(uDepthMap, uv).r * uExtrusionDepth;
        float bloom = smoothstep(1.0 - uBloomIntensity, 1.0, depth);
        vec3 color = mix(
          vec3(depth * 0.5, depth * 0.8, 1.0),
          vec3(depth, depth * 0.3, depth * 0.6),
          uSpectralMode
        );
        color += bloom * vec3(0.3, 0.5, 1.0) * uBloomIntensity;
        float glow = sin(uv.y * 50.0 + uTime * 2.0) * 0.1 + 0.9;
        gl_FragColor = vec4(color * glow, 1.0);
      }
    `
  }

  private generateBassShader(): string {
    return `
      precision highp float;
      uniform float uBeatFrequency;
      uniform float uBassBoost;
      uniform float uKickPattern;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float beat = step(0.5, sin(uv.x * uBeatFrequency * 20.0 + uTime * 4.0));
        float waveform = sin(uv.x * 30.0 + uTime * 2.0) * uBassBoost;
        float kick = step(uKickPattern, sin(uv.y * 10.0 + uTime * 8.0));
        float intensity = beat * waveform * (1.0 + uBassBoost);
        vec3 color = mix(
          vec3(0.1, 0.0, 0.0),
          vec3(1.0, 0.1, 0.0),
          intensity + kick * 0.5
        );
        color += vec3(0.0, intensity * 0.3, intensity * 0.8);
        gl_FragColor = vec4(color, 1.0);
      }
    `
  }
}
