#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_state;
uniform sampler2D u_forceField;
uniform sampler2D u_velocity;
uniform sampler2D u_wells;
uniform vec2 u_offset;
uniform vec2 u_resolution;
uniform float u_wellGlowDensity;
uniform float u_wellGlowDistance;
uniform float u_showGravityField;
uniform float u_redshiftStrength;
uniform float u_spectralRenderingEnabled;
uniform float u_spectralShiftStrength;
uniform float u_spectralSpeedReference;
uniform float u_spectralViewAngle;
uniform float u_spectralHueOffset;
uniform float u_spectralHueSpan;
uniform float u_spectralSaturation;
uniform float u_eventHorizonRadius;
uniform int u_numBlackHoles;
uniform vec4 u_blackHolesData[16];
uniform float u_blackHolesEnabled[16];
uniform float u_gravitySoftening;
uniform float u_whiteHoleEnabled;
uniform float u_whiteHoleRadius;
uniform vec2 u_whiteHolePosition;

vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  vec3 rgb = clamp(p - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

float wrapDelta1(float from, float to) {
  float delta = to - from;
  if (delta > 0.5) {
    return delta - 1.0;
  }
  if (delta < -0.5) {
    return delta + 1.0;
  }
  return delta;
}

vec2 wrapDelta2(vec2 from, vec2 to) {
  return vec2(wrapDelta1(from.x, to.x), wrapDelta1(from.y, to.y));
}

void main() {
  vec2 uv = v_uv + u_offset;
  vec4 state = texture(u_state, uv);
  vec4 force = texture(u_forceField, uv);
  vec2 velocity = texture(u_velocity, uv).rg * 2.0 - 1.0;
  float wells = texture(u_wells, uv).r;

  float life = state.r;

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

  vec2 f = force.rg * 2.0 - 1.0;
  float soft = max(0.001, u_gravitySoftening * 0.01);
  float horizon = max(0.001, u_eventHorizonRadius);

  float potentialSum = 0.0;
  float redshift = 0.0;
  float blackHoleCore = 0.0;
  float aspect = u_resolution.x / u_resolution.y;

  for (int i = 0; i < 16; i++) {
    if (i >= u_numBlackHoles) {
      break;
    }
    if (u_blackHolesEnabled[i] < 0.5) {
      continue;
    }

    vec4 hole = u_blackHolesData[i];
    float mass = hole.x;
    vec2 centered = wrapDelta2(vec2(hole.y, hole.z), uv);
    centered.x *= aspect;
    float radius = length(centered);
    float massMask = smoothstep(0.0, 0.2, mass);

    potentialSum += mass / (radius + soft);

    float holeRedshift = smoothstep(horizon * 1.2, horizon * 6.0, radius);
    holeRedshift = (1.0 - holeRedshift) * clamp(u_redshiftStrength, 0.0, 2.0) * massMask;
    redshift = max(redshift, holeRedshift);

    float holeCore = (1.0 - smoothstep(horizon * 0.7, horizon, radius)) * massMask;
    blackHoleCore = max(blackHoleCore, holeCore);
  }

  float potentialMag = clamp(potentialSum * 0.045, 0.0, 1.0);
  float forceMag = clamp(length(f), 0.0, 1.0);
  float fieldMag = max(forceMag, potentialMag);
  vec3 gravityColor = vec3(0.1, 0.45, 1.0) * fieldMag;

  float speedRef = max(0.001, u_spectralSpeedReference);
  vec2 viewDir = vec2(cos(u_spectralViewAngle), sin(u_spectralViewAngle));
  float lineSpeed = dot(velocity, normalize(viewDir));
  float beta = clamp(lineSpeed / speedRef, -0.985, 0.985);
  float dopplerFactor = sqrt((1.0 + beta) / (1.0 - beta));
  float dopplerShift = clamp(log2(dopplerFactor) * u_spectralShiftStrength, -1.0, 1.0);
  float shift01 = clamp(0.5 + 0.5 * dopplerShift, 0.0, 1.0);

  float hueShifted = fract(
    u_spectralHueOffset +
    shift01 * u_spectralHueSpan -
    clamp(redshift, 0.0, 1.0) * 0.22
  );
  float speedMix = clamp(length(velocity) / speedRef, 0.0, 1.0);
  float value = mix(0.16, 1.0, speedMix);
  vec3 spectralColor = hsv2rgb(vec3(hueShifted, clamp(u_spectralSaturation, 0.0, 1.0), value));
  vec3 classicColor = mix(vec3(0.0), vec3(1.0, 0.1, 0.1), life);
  vec3 lifeColor = mix(classicColor, spectralColor * life, clamp(u_spectralRenderingEnabled, 0.0, 1.0));

  vec3 color = mix(lifeColor, vec3(1.0), wellAlpha);
  color = mix(color, color + gravityColor, clamp(u_showGravityField, 0.0, 1.0));
  color = mix(color, color * vec3(1.15, 0.8, 0.6), clamp(redshift * 0.7, 0.0, 1.0));

  color = mix(color, vec3(0.0), blackHoleCore);

  vec2 whiteHole = u_whiteHolePosition;
  vec2 wh = wrapDelta2(whiteHole, uv);
  wh.x *= u_resolution.x / u_resolution.y;
  float wr = length(wh);
  float whiteCore = (1.0 - smoothstep(u_whiteHoleRadius * 0.5, u_whiteHoleRadius, wr)) * clamp(u_whiteHoleEnabled, 0.0, 1.0);
  float whiteGlow = exp(-wr / max(0.001, u_whiteHoleRadius * 2.5)) * clamp(u_whiteHoleEnabled, 0.0, 1.0);
  color += vec3(0.35, 0.55, 1.0) * (whiteCore * 0.9 + whiteGlow * 0.2);

  fragColor = vec4(color, 1.0);
}
