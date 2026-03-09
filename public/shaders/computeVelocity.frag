#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_prevState;   // previous velocity (RG)
uniform sampler2D u_forceField;  // gravity field (RG)
uniform vec2 u_resolution;
uniform float u_damping;
uniform float u_gravityStrength;
uniform float u_timestep;
uniform vec2 u_whiteHolePosition;
uniform float u_whiteHoleRadius;
uniform float u_whiteHoleEmission;

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
    vec2 vel = texture(u_prevState, v_uv).rg * 2.0 - 1.0;   // [-1,1]
    vec2 force = texture(u_forceField, v_uv).rg * 2.0 - 1.0;

    float dt = max(1e-4, u_timestep);
    float frameFactor = clamp(dt * 60.0, 0.25, 3.0);

    float gravityEnabled = step(1e-4, u_gravityStrength);
    vel += force * (2.2 * frameFactor) * gravityEnabled;
    vel *= pow(clamp(u_damping, 0.0, 1.0), frameFactor);

    float aspect = u_resolution.x / max(1.0, u_resolution.y);
    vec2 deltaWHUv = wrapDelta2(u_whiteHolePosition, v_uv);
    vec2 deltaWHWorld = vec2(deltaWHUv.x * aspect, deltaWHUv.y);
    float rWH = max(length(deltaWHWorld), 1e-6);
    vec2 dirWHWorld = deltaWHWorld / rWH;
    vec2 dirWHUV = normalize(vec2(dirWHWorld.x / aspect, dirWHWorld.y));

    float launchRadius = max(0.001, u_whiteHoleRadius);
    float launchBand = launchRadius * 1.7;
    float launchMask = smoothstep(launchBand, launchRadius * 0.3, rWH) * clamp(u_whiteHoleEmission * 3.0, 0.0, 1.0);
    float coreMask = smoothstep(launchRadius * 0.85, launchRadius * 0.2, rWH);

    float radialSpeed = dot(vel, dirWHUV);
    vec2 tangential = vel - dirWHUV * radialSpeed;
    float targetLaunchSpeed = 0.5;
    float mixedRadial = mix(radialSpeed, targetLaunchSpeed, launchMask);
    vec2 launchedVel = dirWHUV * mixedRadial + tangential * (1.0 - 0.55 * launchMask);
    vel = mix(vel, launchedVel, launchMask);
    vel = mix(vel, dirWHUV * targetLaunchSpeed, coreMask * launchMask);

    float maxSpeed = 1.0;
    float speed = length(vel);
    if (speed > maxSpeed) {
        vel *= maxSpeed / speed;
    }

    // Repack to [0,1]
    outColor = vec4(vel * 0.5 + 0.5, 0.0, 1.0);
}
