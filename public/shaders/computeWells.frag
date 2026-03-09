#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform vec2 u_resolution;
uniform int u_numBlackHoles;
uniform vec4 u_blackHolesData[16];
uniform float u_blackHolesEnabled[16];
uniform float u_eventHorizonRadius;
uniform float u_wellGlowDistance;
uniform float u_wellGlowDensity;

vec2 accumulateWellComponents(vec2 holePosition, float holeMass, float horizon, float glowSpan) {
  vec2 accum = vec2(0.0);
  float massMask = smoothstep(0.0, 0.2, holeMass);

  for (int iy = -1; iy <= 1; iy++) {
    for (int ix = -1; ix <= 1; ix++) {
      vec2 hole = holePosition + vec2(float(ix), float(iy));
      vec2 delta = v_uv - hole;
      delta.x *= u_resolution.x / u_resolution.y;
      float dist = length(delta);

      float singularity = (1.0 - smoothstep(horizon * 0.7, horizon, dist)) * massMask;
      float glow = exp(-dist / max(0.001, horizon + glowSpan * 0.2)) * mix(0.25, 1.0, u_wellGlowDensity) * massMask;
      accum += vec2(singularity, glow);
    }
  }

  return accum;
}

void main() {
  float horizon = max(0.001, u_eventHorizonRadius);
  float glowSpan = mix(0.04, 0.35, clamp(u_wellGlowDistance, 0.0, 1.0));

  float bestSingularity = 0.0;
  float bestGlow = 0.0;

  for (int i = 0; i < 16; i++) {
    if (i >= u_numBlackHoles) {
      break;
    }
    if (u_blackHolesEnabled[i] < 0.5) {
      continue;
    }

    vec4 hole = u_blackHolesData[i];
    vec2 comp = accumulateWellComponents(vec2(hole.y, hole.z), hole.x, horizon, glowSpan);
    bestSingularity = max(bestSingularity, comp.x);
    bestGlow = max(bestGlow, comp.y);
  }

  float wells = clamp(max(bestSingularity, bestGlow), 0.0, 1.0);

  outColor = vec4(wells, 0.0, 0.0, 1.0);
}
