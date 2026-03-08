#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_state;
uniform sampler2D u_forceField;
uniform sampler2D u_wells;
uniform vec2 u_offset;
uniform vec2 u_resolution;
uniform float u_wellGlowDensity;
uniform float u_wellGlowDistance;
uniform float u_showGravityField;
uniform float u_redshiftStrength;
uniform float u_eventHorizonRadius;
uniform float u_blackHoleMass;
uniform vec2 u_blackHolePosition;
uniform float u_blackHole2Mass;
uniform vec2 u_blackHole2Position;
uniform float u_gravitySoftening;
uniform float u_whiteHoleRadius;
uniform vec2 u_whiteHolePosition;

void main() {
  vec2 uv = v_uv + u_offset;
  vec4 state = texture(u_state, uv);
  vec4 force = texture(u_forceField, uv);
  float wells = texture(u_wells, uv).r;

  float life = state.r;
  vec3 lifeColor = mix(vec3(0.0), vec3(1.0, 0.1, 0.1), life);

  vec2 texel = 1.0 / u_resolution;
  float sourceThreshold = mix(0.96, 0.68, u_wellGlowDensity);
  float fadePx = mix(1.0, 10.0, u_wellGlowDistance);
  float glowAccum = 0.0;

  for (int dy = -3; dy <= 3; dy++) {
    for (int dx = -3; dx <= 3; dx++) {
      vec2 o = vec2(float(dx), float(dy));
      float src = texture(u_wells, uv + o * texel).r;
      float sourceMask = smoothstep(sourceThreshold, 1.0, src);
      float dist = length(o);
      float falloff = exp(-dist / max(0.001, fadePx));
      glowAccum += sourceMask * falloff;
    }
  }

  float baseSource = smoothstep(sourceThreshold, 1.0, wells);
  float glow = clamp(glowAccum * 0.11 + baseSource * 0.25, 0.0, 1.0);
  float wellAlpha = clamp(glow * mix(0.08, 0.32, u_wellGlowDensity), 0.0, 0.35);

  vec2 centered = uv - u_blackHolePosition;
  centered.x *= u_resolution.x / u_resolution.y;
  float radius1 = length(centered);
  vec2 centered2 = uv - u_blackHole2Position;
  centered2.x *= u_resolution.x / u_resolution.y;
  float radius2 = length(centered2);

  vec2 f = force.rg * 2.0 - 1.0;
  float soft = max(0.001, u_gravitySoftening * 0.01);
  float potential1 = u_blackHoleMass / (radius1 + soft);
  float potential2 = u_blackHole2Mass / (radius2 + soft);
  float potentialMag = clamp((potential1 + potential2) * 0.045, 0.0, 1.0);
  float forceMag = clamp(length(f), 0.0, 1.0);
  float fieldMag = max(forceMag, potentialMag);
  vec3 gravityColor = vec3(0.1, 0.45, 1.0) * fieldMag;

  float horizon = max(0.001, u_eventHorizonRadius);
  float redshift1 = smoothstep(horizon * 1.2, horizon * 6.0, radius1);
  redshift1 = (1.0 - redshift1) * clamp(u_redshiftStrength, 0.0, 2.0);
  float redshift2 = smoothstep(horizon * 1.2, horizon * 6.0, radius2);
  redshift2 = (1.0 - redshift2) * clamp(u_redshiftStrength, 0.0, 2.0) * smoothstep(0.0, 0.2, u_blackHole2Mass);
  float redshift = max(redshift1, redshift2);

  vec3 color = mix(lifeColor, vec3(1.0), wellAlpha);
  color = mix(color, color + gravityColor, clamp(u_showGravityField, 0.0, 1.0));
  color.r *= 1.0 + 0.35 * redshift;
  color.g *= 1.0 - 0.55 * redshift;
  color.b *= 1.0 - 0.75 * redshift;

  float blackHoleCore1 = 1.0 - smoothstep(horizon * 0.7, horizon, radius1);
  float secondMassMask = smoothstep(0.0, 0.2, u_blackHole2Mass);
  float blackHoleCore2 = (1.0 - smoothstep(horizon * 0.7, horizon, radius2)) * secondMassMask;
  float blackHoleCore = max(blackHoleCore1, blackHoleCore2);
  color = mix(color, vec3(0.0), blackHoleCore);

  float ring2Inner = smoothstep(horizon * 1.05, horizon * 1.55, radius2);
  float ring2Outer = 1.0 - smoothstep(horizon * 1.55, horizon * 2.35, radius2);
  float ring2 = clamp(ring2Inner * ring2Outer, 0.0, 1.0) * secondMassMask;
  color += vec3(1.0, 0.78, 0.34) * ring2 * 0.28;

  vec2 whiteHole = u_whiteHolePosition;
  vec2 wh = uv - whiteHole;
  wh.x *= u_resolution.x / u_resolution.y;
  float wr = length(wh);
  float whiteCore = 1.0 - smoothstep(u_whiteHoleRadius * 0.5, u_whiteHoleRadius, wr);
  float whiteGlow = exp(-wr / max(0.001, u_whiteHoleRadius * 2.5));
  color += vec3(0.35, 0.55, 1.0) * (whiteCore * 0.9 + whiteGlow * 0.2);

  fragColor = vec4(color, 1.0);
}
