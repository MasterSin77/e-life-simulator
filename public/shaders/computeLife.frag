#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_prevState;
uniform vec2 u_resolution;
uniform float u_eventHorizonRadius;
uniform vec2 u_blackHolePosition;
uniform vec2 u_blackHole2Position;
uniform float u_whiteHoleRadius;
uniform float u_whiteHoleEmission;
uniform vec2 u_whiteHolePosition;
uniform float u_lifeUpdateRate;
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

void main() {
    float state = texture(u_prevState, v_uv).r;
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
            vec2 n = v_uv + vec2(float(dx), float(dy)) * pixel;
            if (n.x < 0.0 || n.x > 1.0 || n.y < 0.0 || n.y > 1.0) continue;
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
    vec2 blackHole = u_blackHolePosition;
    vec2 blackHole2 = u_blackHole2Position;
    vec2 whiteHole = u_whiteHolePosition;

    vec2 dBH = vec2((v_uv.x - blackHole.x) * aspect, v_uv.y - blackHole.y);
    vec2 dBH2 = vec2((v_uv.x - blackHole2.x) * aspect, v_uv.y - blackHole2.y);
    vec2 dWH = vec2((v_uv.x - whiteHole.x) * aspect, v_uv.y - whiteHole.y);
    float rBH = length(dBH);
    float rBH2 = length(dBH2);
    float rWH = length(dWH);

    if (rBH < u_eventHorizonRadius || rBH2 < u_eventHorizonRadius) {
        next = 0.0;
    }

    if (rWH < u_whiteHoleRadius) {
        float noise = hash(v_uv * u_resolution + u_time * 17.0);
        next = max(next, step(1.0 - u_whiteHoleEmission, noise));
    }

    outColor = vec4(next, 0.0, 0.0, 1.0);
}
