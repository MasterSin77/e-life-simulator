#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_prevState;   // previous cell state
uniform sampler2D u_velocity;    // local velocity
uniform vec2 u_resolution;
uniform float u_advectionStrength;

vec4 sampleBilinear(sampler2D tex, vec2 texelCoord) {
  vec2 i0 = floor(texelCoord);
  vec2 f = fract(texelCoord);

  vec2 uv00 = (i0 + vec2(0.5, 0.5)) / u_resolution;
  vec2 uv10 = (i0 + vec2(1.5, 0.5)) / u_resolution;
  vec2 uv01 = (i0 + vec2(0.5, 1.5)) / u_resolution;
  vec2 uv11 = (i0 + vec2(1.5, 1.5)) / u_resolution;

  vec4 c00 = texture(tex, uv00);
  vec4 c10 = texture(tex, uv10);
  vec4 c01 = texture(tex, uv01);
  vec4 c11 = texture(tex, uv11);

  vec4 cx0 = mix(c00, c10, f.x);
  vec4 cx1 = mix(c01, c11, f.x);
  return mix(cx0, cx1, f.y);
}

void main() {
  vec2 vel = texture(u_velocity, v_uv).rg * 2.0 - 1.0;
  vec2 texelPos = v_uv * u_resolution;
  vec2 backtrace = texelPos - vel * u_advectionStrength;

  if (
    backtrace.x < 0.5 ||
    backtrace.y < 0.5 ||
    backtrace.x > u_resolution.x - 1.5 ||
    backtrace.y > u_resolution.y - 1.5
  ) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  outColor = sampleBilinear(u_prevState, backtrace);
}
