#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_inputDensity;
uniform vec2 u_resolution;

void main() {
  vec2 texel = 1.0 / u_resolution;
  float sum = 0.0;

  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 offset = vec2(float(x), float(y)) * texel;
      sum += texture(u_inputDensity, v_uv + offset).r;
    }
  }

  sum /= 25.0;  // 5x5 box blur
  fragColor = vec4(sum, 0.0, 0.0, 1.0);
}
