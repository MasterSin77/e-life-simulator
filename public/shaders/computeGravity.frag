#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_inputDensity;
uniform sampler2D u_wells;
uniform vec2 u_resolution;
uniform float u_gravityStrength;
uniform int u_numBlackHoles;
uniform vec4 u_blackHolesData[16];
uniform float u_blackHolesEnabled[16];
uniform float u_gravitySoftening;
uniform float u_eventHorizonRadius;
uniform float u_whiteHoleMass;
uniform float u_whiteHoleRadius;
uniform vec2 u_whiteHolePosition;
uniform float u_time;

vec2 accumulateBlackHoleField(
  vec2 hole,
  float mass,
  float spin,
  float aspect,
  float horizonBoost,
  float particleMass,
  float horizon,
  float soft,
  float spinScale
) {
  vec2 accum = vec2(0.0);
  for (int iy = -1; iy <= 1; iy++) {
    for (int ix = -1; ix <= 1; ix++) {
      vec2 imageHole = hole + vec2(float(ix), float(iy));
      vec2 deltaWorld = vec2((imageHole.x - v_uv.x) * aspect, imageHole.y - v_uv.y);
      float r = max(length(deltaWorld), 1e-5);
      vec2 dirWorld = deltaWorld / r;
      vec2 dirUV = normalize(vec2(dirWorld.x / aspect, dirWorld.y));
      vec2 tanUV = vec2(-dirUV.y, dirUV.x);

      float denom = r * r + soft * soft;
      float accel = (mass * horizonBoost / denom) / particleMass;
      float dampingNearCore = smoothstep(horizon * 0.2, horizon, r);
      float drag = spin * mass / max(soft * soft + r * r * r, 1e-4);

      accum += dirUV * accel * dampingNearCore;
      accum += tanUV * drag * dampingNearCore * spinScale;
    }
  }
  return accum;
}

vec2 accumulateWhiteHoleField(
  vec2 whiteHole,
  float whiteMass,
  float whiteRadius,
  float aspect,
  float particleMass,
  float soft
) {
  vec2 accum = vec2(0.0);
  for (int iy = -1; iy <= 1; iy++) {
    for (int ix = -1; ix <= 1; ix++) {
      vec2 imageHole = whiteHole + vec2(float(ix), float(iy));
      vec2 deltaWorld = vec2((v_uv.x - imageHole.x) * aspect, v_uv.y - imageHole.y);
      float r = max(length(deltaWorld), 1e-5);
      vec2 dirWorld = deltaWorld / r;
      vec2 dirUV = normalize(vec2(dirWorld.x / aspect, dirWorld.y));

      float denom = r * r + soft * soft;
      float whiteCore = smoothstep(whiteRadius * 2.4, whiteRadius * 0.4, r);
      float accel = (whiteMass * whiteCore / denom) / particleMass;
      accum += dirUV * accel;
    }
  }
  return accum;
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;

  float soft = max(0.001, u_gravitySoftening * 0.01);

  float well = texture(u_wells, v_uv).r;
  float density = texture(u_inputDensity, v_uv).r;
  float particleMass = 0.35 + density * 2.4;
  float horizonBoost = 1.0 + well * 0.6;
  float horizon = max(0.001, u_eventHorizonRadius);
  float spinScale = 0.11;

  vec2 forceBH = vec2(0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= u_numBlackHoles) {
      break;
    }
    if (u_blackHolesEnabled[i] < 0.5) {
      continue;
    }

    vec4 hole = u_blackHolesData[i];
    forceBH += accumulateBlackHoleField(
      vec2(hole.y, hole.z),
      hole.x,
      hole.w,
      aspect,
      horizonBoost,
      particleMass,
      horizon,
      soft,
      spinScale
    );
  }

  vec2 forceWH = accumulateWhiteHoleField(
    u_whiteHolePosition,
    u_whiteHoleMass,
    u_whiteHoleRadius,
    aspect,
    particleMass,
    soft
  );

  vec2 force = (
    forceBH +
    forceWH
  ) * u_gravityStrength;

  float maxForce = 1.0;
  float forceLen = length(force);
  if (forceLen > maxForce) {
    force *= maxForce / forceLen;
  }

  outColor = vec4(force * 0.5 + 0.5, 0.0, 1.0);
}
