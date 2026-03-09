#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_prevState;
uniform vec2 u_resolution;
uniform float u_eventHorizonRadius;
uniform int u_numBlackHoles;
uniform vec4 u_blackHolesData[16];
uniform float u_blackHolesEnabled[16];
uniform float u_whiteHoleRadius;
uniform float u_whiteHoleEmission;
uniform vec2 u_whiteHolePosition;
uniform float u_lifeUpdateRate;
uniform float u_lifeEnabled;
uniform float u_denseMassCutoff;
uniform float u_lifeDecayRate;
uniform float u_lifeBirthMin;
uniform float u_lifeBirthMax;
uniform float u_lifeSurvivalMin;
uniform float u_lifeSurvivalMax;
uniform float u_lifeTransportRetention;
uniform float u_time;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
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
    float state = texture(u_prevState, v_uv).r;
    if (u_lifeEnabled < 0.5) {
        outColor = vec4(state, 0.0, 0.0, 1.0);
        return;
    }

    float updateNoise = hash(v_uv * u_resolution + vec2(u_time * 11.0, u_time * 7.0));
    if (updateNoise > u_lifeUpdateRate) {
        outColor = vec4(state, 0.0, 0.0, 1.0);
        return;
    }

    vec2 pixel = 1.0 / u_resolution;
    int alive = 0;

    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            vec2 n = fract(v_uv + vec2(float(dx), float(dy)) * pixel);
            alive += int(texture(u_prevState, n).r > 0.5);
        }
    }

    float aliveF = float(alive);
    float survives = float(
        aliveF >= (u_lifeSurvivalMin - 0.5) &&
        aliveF <= (u_lifeSurvivalMax + 0.5)
    );
    float born = float(
        aliveF >= (u_lifeBirthMin - 0.5) &&
        aliveF <= (u_lifeBirthMax + 0.5)
    );

    float next = (state > 0.5) ? survives : born;

    float transported = smoothstep(0.18, 0.9, state) * clamp(u_lifeTransportRetention, 0.0, 1.0);
    float localMass = max(state, float(alive) / 8.0);
    if (localMass >= u_denseMassCutoff) {
        next = state;
    }
    next = max(next, transported);
    next = mix(state, next, clamp(u_lifeDecayRate, 0.0, 1.0));

    float aspect = u_resolution.x / u_resolution.y;
    bool inEventHorizon = false;
    for (int i = 0; i < 16; i++) {
        if (i >= u_numBlackHoles) {
            break;
        }
        if (u_blackHolesEnabled[i] < 0.5) {
            continue;
        }

        vec4 hole = u_blackHolesData[i];
        vec2 dBHuv = wrapDelta2(vec2(hole.y, hole.z), v_uv);
        vec2 dBH = vec2(dBHuv.x * aspect, dBHuv.y);
        if (length(dBH) < u_eventHorizonRadius) {
            inEventHorizon = true;
            break;
        }
    }

    if (inEventHorizon) {
        next = 0.0;
    }

    vec2 whiteHole = u_whiteHolePosition;
    vec2 dWHuv = wrapDelta2(whiteHole, v_uv);
    vec2 dWH = vec2(dWHuv.x * aspect, dWHuv.y);
    float rWH = length(dWH);

    if (rWH < u_whiteHoleRadius) {
        float noise = hash(v_uv * u_resolution + u_time * 17.0);
        next = max(next, step(1.0 - u_whiteHoleEmission, noise));
    }

    outColor = vec4(next, 0.0, 0.0, 1.0);
}
