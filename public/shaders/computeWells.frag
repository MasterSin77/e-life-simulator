#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform vec2 u_resolution;
uniform vec2 u_blackHolePosition;
uniform float u_blackHoleMass;
uniform vec2 u_blackHole2Position;
uniform float u_blackHole2Mass;
uniform float u_eventHorizonRadius;
uniform float u_wellGlowDistance;
uniform float u_wellGlowDensity;

void main() {
  vec2 p1 = v_uv - u_blackHolePosition;
  p1.x *= u_resolution.x / u_resolution.y;
  vec2 p2 = v_uv - u_blackHole2Position;
  p2.x *= u_resolution.x / u_resolution.y;

  float dist1 = length(p1);
  float dist2 = length(p2);
  float horizon = max(0.001, u_eventHorizonRadius);
  float glowSpan = mix(0.04, 0.35, clamp(u_wellGlowDistance, 0.0, 1.0));

  float mass1 = smoothstep(0.0, 0.2, u_blackHoleMass);
  float mass2 = smoothstep(0.0, 0.2, u_blackHole2Mass);

  float singularity1 = (1.0 - smoothstep(horizon * 0.7, horizon, dist1)) * mass1;
  float singularity2 = (1.0 - smoothstep(horizon * 0.7, horizon, dist2)) * mass2;
  float glow1 = exp(-dist1 / max(0.001, horizon + glowSpan * 0.2)) * mix(0.25, 1.0, u_wellGlowDensity) * mass1;
  float glow2 = exp(-dist2 / max(0.001, horizon + glowSpan * 0.2)) * mix(0.25, 1.0, u_wellGlowDensity) * mass2;

  float wells = clamp(max(max(singularity1, singularity2), max(glow1, glow2)), 0.0, 1.0);

  outColor = vec4(wells, 0.0, 0.0, 1.0);
}
