#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_inputDensity;
uniform sampler2D u_wells;
uniform vec2 u_resolution;
uniform float u_gravityStrength;
uniform float u_blackHoleMass;
uniform vec2 u_blackHolePosition;
uniform float u_blackHoleSpin;
uniform float u_blackHole2Mass;
uniform vec2 u_blackHole2Position;
uniform float u_blackHole2Spin;
uniform float u_gravitySoftening;
uniform float u_eventHorizonRadius;
uniform float u_whiteHoleMass;
uniform float u_whiteHoleRadius;
uniform vec2 u_whiteHolePosition;
uniform float u_time;

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 blackHole = u_blackHolePosition;
  vec2 blackHole2 = u_blackHole2Position;
  vec2 whiteHole = u_whiteHolePosition;

  vec2 deltaBHWorld = vec2((blackHole.x - v_uv.x) * aspect, blackHole.y - v_uv.y);
  float rBH = max(length(deltaBHWorld), 1e-5);
  vec2 dirBHWorld = deltaBHWorld / rBH;
  vec2 dirBHUV = normalize(vec2(dirBHWorld.x / aspect, dirBHWorld.y));
  vec2 tanBHUV = vec2(-dirBHUV.y, dirBHUV.x);

  vec2 deltaWHWorld = vec2((v_uv.x - whiteHole.x) * aspect, v_uv.y - whiteHole.y);
  float rWH = max(length(deltaWHWorld), 1e-5);
  vec2 dirWHWorld = deltaWHWorld / rWH;
  vec2 dirWHUV = normalize(vec2(dirWHWorld.x / aspect, dirWHWorld.y));

  vec2 deltaBH2World = vec2((blackHole2.x - v_uv.x) * aspect, blackHole2.y - v_uv.y);
  float rBH2 = max(length(deltaBH2World), 1e-5);
  vec2 dirBH2World = deltaBH2World / rBH2;
  vec2 dirBH2UV = normalize(vec2(dirBH2World.x / aspect, dirBH2World.y));
  vec2 tanBH2UV = vec2(-dirBH2UV.y, dirBH2UV.x);

  float soft = max(0.001, u_gravitySoftening * 0.01);
  float denomBH = rBH * rBH + soft * soft;
  float denomBH2 = rBH2 * rBH2 + soft * soft;
  float denomWH = rWH * rWH + soft * soft;

  float well = texture(u_wells, v_uv).r;
  float density = texture(u_inputDensity, v_uv).r;
  float particleMass = 0.35 + density * 2.4;
  float horizonBoost = 1.0 + well * 0.6;

  float accelBH = (u_blackHoleMass * horizonBoost / denomBH) / particleMass;
  float accelBH2 = (u_blackHole2Mass * horizonBoost / denomBH2) / particleMass;
  float whiteCore = smoothstep(u_whiteHoleRadius * 2.4, u_whiteHoleRadius * 0.4, rWH);
  float accelWH = (u_whiteHoleMass * whiteCore / denomWH) / particleMass;

  float horizon = max(0.001, u_eventHorizonRadius);
  float dampingNearCore = smoothstep(horizon * 0.2, horizon, rBH);
  float dampingNearCore2 = smoothstep(horizon * 0.2, horizon, rBH2);

  float spinScale = 0.11;
  float dragBH = u_blackHoleSpin * u_blackHoleMass / max(soft * soft + rBH * rBH * rBH, 1e-4);
  float dragBH2 = u_blackHole2Spin * u_blackHole2Mass / max(soft * soft + rBH2 * rBH2 * rBH2, 1e-4);

  float r12 = max(length(vec2((blackHole2.x - blackHole.x) * aspect, blackHole2.y - blackHole.y)), 1e-5);
  vec2 com = (blackHole * u_blackHoleMass + blackHole2 * u_blackHole2Mass) / max(1e-5, u_blackHoleMass + u_blackHole2Mass);
  vec2 dCom = vec2((v_uv.x - com.x) * aspect, v_uv.y - com.y);
  float rCom = length(dCom);
  vec2 binaryDir = normalize(vec2((blackHole2.x - blackHole.x), (blackHole2.y - blackHole.y)));
  float binaryFreq = 1.2 / max(0.08, r12);
  float wavePhase = u_time * binaryFreq * 6.2831853 - rCom * 22.0;
  float strain = clamp((u_blackHoleMass * u_blackHole2Mass) / (r12 * r12 + soft * soft) * 0.04, 0.0, 1.0);
  float waveEnvelope = exp(-rCom / max(0.04, r12 * 2.2));
  vec2 waveForce = binaryDir * (sin(wavePhase) * strain * waveEnvelope * 0.09);

  vec2 force = (
    dirBHUV * accelBH * dampingNearCore +
    dirBH2UV * accelBH2 * dampingNearCore2 +
    dirWHUV * accelWH +
    tanBHUV * dragBH * dampingNearCore * spinScale +
    tanBH2UV * dragBH2 * dampingNearCore2 * spinScale +
    waveForce
  ) * u_gravityStrength;

  float maxForce = 1.0;
  float forceLen = length(force);
  if (forceLen > maxForce) {
    force *= maxForce / forceLen;
  }

  outColor = vec4(force * 0.5 + 0.5, 0.0, 1.0);
}
