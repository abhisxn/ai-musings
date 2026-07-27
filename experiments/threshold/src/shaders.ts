export const bayerDitherVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const bayerDitherFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uFrame;
  uniform vec2 uResolution;
  uniform float uLevels;

  varying vec2 vUv;

  // Hard Bayer 4x4 dither; reads as a rasterized-bitmap look rather than
  // smooth gradients (the moodboard dither/half-pixel-face reference).
  float bayer4x4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int idx = y * 4 + x;
    float bayer[16] = float[16](
      0.0,  8.0,  2.0, 10.0,
     12.0,  4.0, 14.0,  6.0,
      3.0, 11.0,  1.0,  9.0,
     15.0,  7.0, 13.0,  5.0
    );
    return bayer[idx] / 16.0;
  }

  void main() {
    vec3 color = texture2D(uFrame, vUv).rgb;
    float brightness = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
    float threshold = bayer4x4(gl_FragCoord.xy);
    float level = floor(brightness * uLevels + threshold);
    level = clamp(level, 0.0, uLevels);
    float outputGray = level / uLevels;
    gl_FragColor = vec4(vec3(outputGray), 1.0);
  }
`
