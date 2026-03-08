#version 300 es
precision highp float;

in vec2 v_uv;  // Must match vertex shader
out vec4 fragColor;

uniform sampler2D u_prevState;

void main() {
  // Read density (R channel)
  float life = texture(u_prevState, v_uv).r;
  fragColor = vec4(life, 0.0, 0.0, 1.0);
}
