import { makeProgram } from '../utils/webglUtils';
import { computeObjectiveMetrics } from '../simulation/objectiveMetrics';
import {
    defaultSimulationControls,
    ObjectiveMetrics,
    SimulationControls,
    sanitizeSimulationControls,
} from './simulationTypes';

interface LifeEngineOptions {
    setFps?: (fps: number) => void;
    setPups?: (pups: number) => void;
    getOffset?: () => { x: number; y: number };
    getControls?: () => SimulationControls;
    onMetrics?: (metrics: ObjectiveMetrics) => void;
}

export interface LifeEngineSnapshot {
    width: number;
    height: number;
    state: Uint8Array;
    force: Uint8Array;
    velocity: Uint8Array;
    wells: Uint8Array;
}

export interface LifeEngineHandle {
    stop: () => void;
    randomize: (seedDensity?: number) => void;
    resize: (width: number, height: number) => void;
    captureSnapshot: () => LifeEngineSnapshot;
    restoreSnapshot: (snapshot: LifeEngineSnapshot) => void;
}

export async function startLifeEngine(
    canvas: HTMLCanvasElement,
    options: LifeEngineOptions = {}
): Promise<LifeEngineHandle> {
    const MAX_BLACK_HOLES = 16;
    const { setFps, setPups, getOffset, getControls, onMetrics } = options;
    const searchParams = new URLSearchParams(window.location.search);
    const perfProbeEnabled =
        searchParams.get('perfProbe') === '1' ||
        window.localStorage.getItem('elife:perfProbe') === '1';
    const objectiveMetricsEnabled =
        searchParams.get('metrics') === 'on' ||
        window.localStorage.getItem('elife:metrics') === 'on';
    const metricsSampleIntervalFrames = Math.max(
        15,
        Number.parseInt(searchParams.get('metricsEvery') ?? '90', 10) || 90
    );

    const frameDtWindow: number[] = [];
    const frameWindowSize = 240;
    let frameIndex = 0;
    let lastMetricsDurationMs = 0;
    let lastMetricsFrame = Number.NEGATIVE_INFINITY;
    const gl = canvas.getContext('webgl2', {
        preserveDrawingBuffer: true,
        alpha: false,
    })!;
    if (!gl) throw new Error('WebGL2 not supported');
    const supportsFloatTargets = !!gl.getExtension('EXT_color_buffer_float');

    // === Load all shaders ===
    const densityFS = await fetch('/shaders/computeDensity.frag').then(r => r.text());
    const blurFS = await fetch('/shaders/blurDensity.frag').then(r => r.text());
    const gravityFS = await fetch('/shaders/computeGravity.frag').then(r => r.text());
    const wellsFS = await fetch('/shaders/computeWells.frag').then(r => r.text());
    const velocityFS = await fetch('/shaders/computeVelocity.frag').then(r => r.text());
    const advectFS = await fetch('/shaders/advectPosition.frag').then(r => r.text());
    const lifeFS = await fetch('/shaders/computeLife.frag').then(r => r.text());
    const displayFS = await fetch('/shaders/display.frag').then(r => r.text());

    // === Programs ===
    const densityProgram = makeProgram(gl, densityFS);
    const blurProgram = makeProgram(gl, blurFS);
    const gravityProgram = makeProgram(gl, gravityFS);
    const wellsProgram = makeProgram(gl, wellsFS);
    const velocityProgram = makeProgram(gl, velocityFS);
    const advectProgram = makeProgram(gl, advectFS);
    const lifeProgram = makeProgram(gl, lifeFS);
    const displayProgram = makeProgram(gl, displayFS);
    const copyProgram = makeProgram(gl, `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_texture;
void main() {
    outColor = texture(u_texture, v_uv);
}
`);
    const programs = [
        densityProgram,
        blurProgram,
        gravityProgram,
        wellsProgram,
        velocityProgram,
        advectProgram,
        lifeProgram,
        copyProgram,
        displayProgram,
    ];

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(densityProgram, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const allocateTextureStorage = (texture: WebGLTexture, useFloat: boolean) => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        if (useFloat) {
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA16F,
                canvas.width,
                canvas.height,
                0,
                gl.RGBA,
                gl.HALF_FLOAT,
                null
            );
        } else {
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                canvas.width,
                canvas.height,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                null
            );
        }
    };

    const createTex = (useFloat = false) => {
        const t = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        allocateTextureStorage(t, useFloat);
        return t;
    };

    const useFloatForDynamics = supportsFloatTargets;

    let A = createTex();
    let B = createTex(useFloatForDynamics);
    let V = createTex(useFloatForDynamics);
    let W = createTex(useFloatForDynamics);
    let C = createTex();
    let D = createTex();
    let E = createTex();
    let F = createTex();
    const textures = () => [A, B, V, W, C, D, E, F];

    const fA = gl.createFramebuffer()!;
    const fB = gl.createFramebuffer()!;
    const fV = gl.createFramebuffer()!;
    const fW = gl.createFramebuffer()!;
    const fC = gl.createFramebuffer()!;
    const fD = gl.createFramebuffer()!;
    const fE = gl.createFramebuffer()!;
    const fF = gl.createFramebuffer()!;
    const framebuffers = [fA, fB, fV, fW, fC, fD, fE, fF];
    const uploadTexture = createTex(false);

    const bindFramebufferTexture = (f: WebGLFramebuffer, t: WebGLTexture) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    };

    bindFramebufferTexture(fA, A);
    bindFramebufferTexture(fB, B);
    bindFramebufferTexture(fV, V);
    bindFramebufferTexture(fW, W);
    bindFramebufferTexture(fC, C);
    bindFramebufferTexture(fD, D);
    bindFramebufferTexture(fE, E);
    bindFramebufferTexture(fF, F);

    const setSamplerUniform = (
        program: WebGLProgram,
        candidates: string[],
        unit: number
    ) => {
        for (const name of candidates) {
            const location = gl.getUniformLocation(program, name);
            if (location !== null) {
                gl.uniform1i(location, unit);
            }
        }
    };

    const createFillBuffers = (seedDensity: number) => {
        const state = new Uint8Array(canvas.width * canvas.height * 4);
        const velocityByte = new Uint8Array(canvas.width * canvas.height * 4);
        for (let i = 0; i < state.length; i += 4) {
            state[i] = Math.random() < seedDensity ? 255 : 0;
            state[i + 1] = 0;
            state[i + 2] = 0;
            state[i + 3] = 255;

            velocityByte[i] = 128;
            velocityByte[i + 1] = 128;
            velocityByte[i + 2] = 0;
            velocityByte[i + 3] = 255;
        }
        return { state, velocityByte };
    };

    const randomize = (seedDensity?: number) => {
        const controls = sanitizeSimulationControls(getControls?.() ?? defaultSimulationControls);
        const { state, velocityByte } = createFillBuffers(seedDensity ?? controls.seedDensity);
        const wells = new Uint8Array(canvas.width * canvas.height * 4);
        for (let i = 0; i < wells.length; i += 4) {
            wells[i] = 0;
            wells[i + 1] = 0;
            wells[i + 2] = 0;
            wells[i + 3] = 255;
        }

        const neutralForceByte = velocityByte;

        gl.bindTexture(gl.TEXTURE_2D, A);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, state);
        gl.bindTexture(gl.TEXTURE_2D, D);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, state);
        gl.bindTexture(gl.TEXTURE_2D, V);
        if (useFloatForDynamics) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, fV);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.5, 0.5, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        } else {
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0,
                canvas.width,
                canvas.height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                velocityByte
            );
        }
        gl.bindTexture(gl.TEXTURE_2D, W);
        if (useFloatForDynamics) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, fW);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.5, 0.5, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        } else {
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0,
                canvas.width,
                canvas.height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                velocityByte
            );
        }
        gl.bindTexture(gl.TEXTURE_2D, B);
        if (useFloatForDynamics) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, fB);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.5, 0.5, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        } else {
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0,
                canvas.width,
                canvas.height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                neutralForceByte
            );
        }
        gl.bindTexture(gl.TEXTURE_2D, E);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, wells);
        gl.bindTexture(gl.TEXTURE_2D, F);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, wells);
    };

    randomize();

    let last = performance.now();
    let timestepSeconds = 1 / 60;
    let fpsSmooth = 60;
    let running = true;
    let rafId = 0;
    let metricFrameCounter = 0;
    let disposed = false;

    const pass = (
        program: WebGLProgram,
        inputs: WebGLTexture[],
        out: WebGLFramebuffer | null,
        now: number
    ) => {
        gl.useProgram(program);
        const controls = sanitizeSimulationControls(getControls?.() ?? defaultSimulationControls);

        const uploadBlackHoleArrayUniforms = () => {
            const holes = controls.blackHoles.slice(0, MAX_BLACK_HOLES);
            const masses = new Float32Array(MAX_BLACK_HOLES);
            const spins = new Float32Array(MAX_BLACK_HOLES);
            const enabled = new Float32Array(MAX_BLACK_HOLES);
            const positions = new Float32Array(MAX_BLACK_HOLES * 2);
            const packed = new Float32Array(MAX_BLACK_HOLES * 4);

            for (let i = 0; i < holes.length; i += 1) {
                const hole = holes[i];
                masses[i] = hole.mass;
                spins[i] = hole.spin;
                enabled[i] = hole.enabled ? 1 : 0;
                positions[i * 2] = hole.x;
                positions[i * 2 + 1] = hole.y;
                packed[i * 4] = hole.mass;
                packed[i * 4 + 1] = hole.x;
                packed[i * 4 + 2] = hole.y;
                packed[i * 4 + 3] = hole.spin;
            }

            const countLoc = gl.getUniformLocation(program, 'u_numBlackHoles');
            if (countLoc !== null) {
                gl.uniform1i(countLoc, holes.length);
            }

            const massesLoc = gl.getUniformLocation(program, 'u_blackHoleMasses');
            if (massesLoc !== null) {
                gl.uniform1fv(massesLoc, masses);
            }

            const spinsLoc = gl.getUniformLocation(program, 'u_blackHoleSpins');
            if (spinsLoc !== null) {
                gl.uniform1fv(spinsLoc, spins);
            }

            const enabledLoc = gl.getUniformLocation(program, 'u_blackHolesEnabled');
            if (enabledLoc !== null) {
                gl.uniform1fv(enabledLoc, enabled);
            }

            const positionsLoc = gl.getUniformLocation(program, 'u_blackHolePositions');
            if (positionsLoc !== null) {
                gl.uniform2fv(positionsLoc, positions);
            }

            const packedLoc = gl.getUniformLocation(program, 'u_blackHolesData');
            if (packedLoc !== null) {
                gl.uniform4fv(packedLoc, packed);
            }
        };

        uploadBlackHoleArrayUniforms();
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        if (resolutionLoc !== null) {
            gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
        }

        inputs.forEach((tex, i) => {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            if (i === 0) {
                setSamplerUniform(program, ['u_prevState', 'u_state', 'u_inputDensity', 'u_texture'], i);
            } else if (i === 1) {
                setSamplerUniform(program, ['u_forceField', 'u_inputDensity', 'u_wells', 'u_input'], i);
            } else if (i === 2) {
                setSamplerUniform(program, ['u_velocity'], i);
            } else {
                setSamplerUniform(program, ['u_wells', 'u_input'], i);
            }
        });

        const offsetLoc = gl.getUniformLocation(program, 'u_offset');
        if (getOffset && offsetLoc !== null) {
            const offset = getOffset();
            gl.uniform2f(offsetLoc, (offset.x / canvas.width) % 1, (offset.y / canvas.height) % 1);
        }

        const timestepLoc = gl.getUniformLocation(program, 'u_timestep');
        if (timestepLoc !== null) {
            gl.uniform1f(timestepLoc, timestepSeconds);
        }

        const gravityLoc = gl.getUniformLocation(program, 'u_gravityStrength');
        if (gravityLoc !== null) {
            gl.uniform1f(gravityLoc, controls.gravityStrength);
        }

        const blackHoleEnabledLoc = gl.getUniformLocation(program, 'u_blackHoleEnabled');
        if (blackHoleEnabledLoc !== null) {
            gl.uniform1f(blackHoleEnabledLoc, controls.blackHoleEnabled ? 1 : 0);
        }

        const blackHole2EnabledLoc = gl.getUniformLocation(program, 'u_blackHole2Enabled');
        if (blackHole2EnabledLoc !== null) {
            gl.uniform1f(blackHole2EnabledLoc, controls.blackHole2Enabled ? 1 : 0);
        }

        const blackHole3EnabledLoc = gl.getUniformLocation(program, 'u_blackHole3Enabled');
        if (blackHole3EnabledLoc !== null) {
            gl.uniform1f(blackHole3EnabledLoc, controls.blackHole3Enabled ? 1 : 0);
        }

        const whiteHoleEnabledLoc = gl.getUniformLocation(program, 'u_whiteHoleEnabled');
        if (whiteHoleEnabledLoc !== null) {
            gl.uniform1f(whiteHoleEnabledLoc, controls.whiteHoleEnabled ? 1 : 0);
        }

        const blackHoleMassLoc = gl.getUniformLocation(program, 'u_blackHoleMass');
        if (blackHoleMassLoc !== null) {
            gl.uniform1f(blackHoleMassLoc, controls.blackHoleEnabled ? controls.blackHoleMass : 0);
        }

        const blackHolePositionLoc = gl.getUniformLocation(program, 'u_blackHolePosition');
        if (blackHolePositionLoc !== null) {
            gl.uniform2f(blackHolePositionLoc, controls.blackHoleX, controls.blackHoleY);
        }

        const blackHoleSpinLoc = gl.getUniformLocation(program, 'u_blackHoleSpin');
        if (blackHoleSpinLoc !== null) {
            gl.uniform1f(blackHoleSpinLoc, controls.blackHoleSpin);
        }

        const blackHole2MassLoc = gl.getUniformLocation(program, 'u_blackHole2Mass');
        if (blackHole2MassLoc !== null) {
            gl.uniform1f(blackHole2MassLoc, controls.blackHole2Enabled ? controls.blackHole2Mass : 0);
        }

        const blackHole2PositionLoc = gl.getUniformLocation(program, 'u_blackHole2Position');
        if (blackHole2PositionLoc !== null) {
            gl.uniform2f(blackHole2PositionLoc, controls.blackHole2X, controls.blackHole2Y);
        }

        const blackHole2SpinLoc = gl.getUniformLocation(program, 'u_blackHole2Spin');
        if (blackHole2SpinLoc !== null) {
            gl.uniform1f(blackHole2SpinLoc, controls.blackHole2Spin);
        }

        const blackHole3MassLoc = gl.getUniformLocation(program, 'u_blackHole3Mass');
        if (blackHole3MassLoc !== null) {
            gl.uniform1f(blackHole3MassLoc, controls.blackHole3Enabled ? controls.blackHole3Mass : 0);
        }

        const blackHole3PositionLoc = gl.getUniformLocation(program, 'u_blackHole3Position');
        if (blackHole3PositionLoc !== null) {
            gl.uniform2f(blackHole3PositionLoc, controls.blackHole3X, controls.blackHole3Y);
        }

        const blackHole3SpinLoc = gl.getUniformLocation(program, 'u_blackHole3Spin');
        if (blackHole3SpinLoc !== null) {
            gl.uniform1f(blackHole3SpinLoc, controls.blackHole3Spin);
        }

        const gravitySofteningLoc = gl.getUniformLocation(program, 'u_gravitySoftening');
        if (gravitySofteningLoc !== null) {
            gl.uniform1f(gravitySofteningLoc, controls.gravitySoftening);
        }

        const eventHorizonLoc = gl.getUniformLocation(program, 'u_eventHorizonRadius');
        if (eventHorizonLoc !== null) {
            gl.uniform1f(eventHorizonLoc, controls.eventHorizonRadius);
        }

        const whiteHoleMassLoc = gl.getUniformLocation(program, 'u_whiteHoleMass');
        if (whiteHoleMassLoc !== null) {
            gl.uniform1f(whiteHoleMassLoc, controls.whiteHoleEnabled ? controls.whiteHoleMass : 0);
        }

        const whiteHoleRadiusLoc = gl.getUniformLocation(program, 'u_whiteHoleRadius');
        if (whiteHoleRadiusLoc !== null) {
            gl.uniform1f(whiteHoleRadiusLoc, controls.whiteHoleEnabled ? controls.whiteHoleRadius : 0.0001);
        }

        const whiteHolePositionLoc = gl.getUniformLocation(program, 'u_whiteHolePosition');
        if (whiteHolePositionLoc !== null) {
            gl.uniform2f(whiteHolePositionLoc, controls.whiteHoleX, controls.whiteHoleY);
        }

        const whiteHoleEmissionLoc = gl.getUniformLocation(program, 'u_whiteHoleEmission');
        if (whiteHoleEmissionLoc !== null) {
            gl.uniform1f(whiteHoleEmissionLoc, controls.whiteHoleEnabled ? controls.whiteHoleEmission : 0);
        }

        const redshiftStrengthLoc = gl.getUniformLocation(program, 'u_redshiftStrength');
        if (redshiftStrengthLoc !== null) {
            gl.uniform1f(redshiftStrengthLoc, controls.redshiftStrength);
        }

        const spectralRenderingEnabledLoc = gl.getUniformLocation(program, 'u_spectralRenderingEnabled');
        if (spectralRenderingEnabledLoc !== null) {
            gl.uniform1f(spectralRenderingEnabledLoc, controls.spectralRenderingEnabled ? 1 : 0);
        }

        const spectralShiftStrengthLoc = gl.getUniformLocation(program, 'u_spectralShiftStrength');
        if (spectralShiftStrengthLoc !== null) {
            gl.uniform1f(spectralShiftStrengthLoc, controls.spectralShiftStrength);
        }

        const spectralSpeedReferenceLoc = gl.getUniformLocation(program, 'u_spectralSpeedReference');
        if (spectralSpeedReferenceLoc !== null) {
            gl.uniform1f(spectralSpeedReferenceLoc, controls.spectralSpeedReference);
        }

        const spectralViewAngleLoc = gl.getUniformLocation(program, 'u_spectralViewAngle');
        if (spectralViewAngleLoc !== null) {
            gl.uniform1f(spectralViewAngleLoc, controls.spectralViewAngle * (Math.PI / 180));
        }

        const spectralHueOffsetLoc = gl.getUniformLocation(program, 'u_spectralHueOffset');
        if (spectralHueOffsetLoc !== null) {
            gl.uniform1f(spectralHueOffsetLoc, controls.spectralHueOffset);
        }

        const spectralHueSpanLoc = gl.getUniformLocation(program, 'u_spectralHueSpan');
        if (spectralHueSpanLoc !== null) {
            gl.uniform1f(spectralHueSpanLoc, controls.spectralHueSpan);
        }

        const spectralSaturationLoc = gl.getUniformLocation(program, 'u_spectralSaturation');
        if (spectralSaturationLoc !== null) {
            gl.uniform1f(spectralSaturationLoc, controls.spectralSaturation);
        }

        const showGravityFieldLoc = gl.getUniformLocation(program, 'u_showGravityField');
        if (showGravityFieldLoc !== null) {
            gl.uniform1f(showGravityFieldLoc, controls.showGravityField ? 1 : 0);
        }

        const wellGlowDensityLoc = gl.getUniformLocation(program, 'u_wellGlowDensity');
        if (wellGlowDensityLoc !== null) {
            gl.uniform1f(wellGlowDensityLoc, controls.wellGlowDensity);
        }

        const wellGlowDistanceLoc = gl.getUniformLocation(program, 'u_wellGlowDistance');
        if (wellGlowDistanceLoc !== null) {
            gl.uniform1f(wellGlowDistanceLoc, controls.wellGlowDistance);
        }

        const timeLoc = gl.getUniformLocation(program, 'u_time');
        if (timeLoc !== null) {
            gl.uniform1f(timeLoc, now * 0.001);
        }

        const dampingLoc = gl.getUniformLocation(program, 'u_damping');
        if (dampingLoc !== null) {
            gl.uniform1f(dampingLoc, controls.driftDamping);
        }

        const lifeUpdateRateLoc = gl.getUniformLocation(program, 'u_lifeUpdateRate');
        if (lifeUpdateRateLoc !== null) {
            gl.uniform1f(lifeUpdateRateLoc, controls.lifeUpdateRate);
        }

        const lifeEnabledLoc = gl.getUniformLocation(program, 'u_lifeEnabled');
        if (lifeEnabledLoc !== null) {
            gl.uniform1f(lifeEnabledLoc, controls.lifeEnabled ? 1 : 0);
        }

        const denseMassCutoffLoc = gl.getUniformLocation(program, 'u_denseMassCutoff');
        if (denseMassCutoffLoc !== null) {
            gl.uniform1f(denseMassCutoffLoc, controls.denseMassCutoff);
        }

        const lifeDecayRateLoc = gl.getUniformLocation(program, 'u_lifeDecayRate');
        if (lifeDecayRateLoc !== null) {
            gl.uniform1f(lifeDecayRateLoc, controls.lifeDecayRate);
        }

        const lifeBirthMinLoc = gl.getUniformLocation(program, 'u_lifeBirthMin');
        if (lifeBirthMinLoc !== null) {
            gl.uniform1f(lifeBirthMinLoc, controls.lifeBirthMin);
        }

        const lifeBirthMaxLoc = gl.getUniformLocation(program, 'u_lifeBirthMax');
        if (lifeBirthMaxLoc !== null) {
            gl.uniform1f(lifeBirthMaxLoc, controls.lifeBirthMax);
        }

        const lifeSurvivalMinLoc = gl.getUniformLocation(program, 'u_lifeSurvivalMin');
        if (lifeSurvivalMinLoc !== null) {
            gl.uniform1f(lifeSurvivalMinLoc, controls.lifeSurvivalMin);
        }

        const lifeSurvivalMaxLoc = gl.getUniformLocation(program, 'u_lifeSurvivalMax');
        if (lifeSurvivalMaxLoc !== null) {
            gl.uniform1f(lifeSurvivalMaxLoc, controls.lifeSurvivalMax);
        }

        const lifeTransportRetentionLoc = gl.getUniformLocation(program, 'u_lifeTransportRetention');
        if (lifeTransportRetentionLoc !== null) {
            gl.uniform1f(lifeTransportRetentionLoc, controls.lifeTransportRetention);
        }

        const advectionLoc = gl.getUniformLocation(program, 'u_advectionStrength');
        if (advectionLoc !== null) {
            gl.uniform1f(advectionLoc, controls.advectionStrength);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, out);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const sampleMetrics = () => {
        const sampleStart = performance.now();
        const stateReadback = new Uint8Array(canvas.width * canvas.height * 4);
        const velocityReadback = new Uint8Array(canvas.width * canvas.height * 4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fA);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, stateReadback);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fV);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, velocityReadback);

        onMetrics?.(computeObjectiveMetrics(stateReadback, velocityReadback, canvas.width, canvas.height));
        return performance.now() - sampleStart;
    };

    const logPerfProbeFrame = (dtMs: number) => {
        if (!perfProbeEnabled) {
            return;
        }

        frameDtWindow.push(dtMs);
        if (frameDtWindow.length > frameWindowSize) {
            frameDtWindow.shift();
        }

        const nearMetricsSample = frameIndex - lastMetricsFrame <= 2;
        if (dtMs >= 22) {
            console.warn(
                `[perf-probe] long frame ${dtMs.toFixed(2)}ms at frame ${frameIndex}. ` +
                `nearMetrics=${nearMetricsSample} metricsReadMs=${lastMetricsDurationMs.toFixed(2)}`
            );
        }

        if (frameDtWindow.length >= 120 && frameIndex % 60 === 0) {
            const sorted = [...frameDtWindow].sort((a, b) => a - b);
            const p99Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));
            const p99 = sorted[p99Index];
            const average = frameDtWindow.reduce((sum, value) => sum + value, 0) / frameDtWindow.length;
            const onePercentLowFps = p99 > 0 ? 1000 / p99 : 0;

            console.info(
                `[perf-probe] avg=${average.toFixed(2)}ms ` +
                `p99=${p99.toFixed(2)}ms 1%low=${onePercentLowFps.toFixed(1)}fps ` +
                `metrics=${objectiveMetricsEnabled ? 'on' : 'off'} every=${metricsSampleIntervalFrames}f`
            );
        }
    };

    const readFramebuffer = (framebuffer: WebGLFramebuffer) => {
        const readback = new Uint8Array(canvas.width * canvas.height * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, readback);
        return readback;
    };

    const uploadToTexture = (
        texture: WebGLTexture,
        framebuffer: WebGLFramebuffer,
        data: Uint8Array,
        useFloatTarget: boolean
    ) => {
        if (!useFloatTarget) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0,
                canvas.width,
                canvas.height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                data
            );
            return;
        }

        gl.bindTexture(gl.TEXTURE_2D, uploadTexture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            canvas.width,
            canvas.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data
        );
        pass(copyProgram, [uploadTexture], framebuffer, performance.now());
    };

    const resize = (width: number, height: number) => {
        canvas.width = Math.max(1, Math.floor(width));
        canvas.height = Math.max(1, Math.floor(height));

        allocateTextureStorage(A, false);
        allocateTextureStorage(B, useFloatForDynamics);
        allocateTextureStorage(V, useFloatForDynamics);
        allocateTextureStorage(W, useFloatForDynamics);
        allocateTextureStorage(C, false);
        allocateTextureStorage(D, false);
        allocateTextureStorage(E, false);
        allocateTextureStorage(F, false);

        bindFramebufferTexture(fA, A);
        bindFramebufferTexture(fB, B);
        bindFramebufferTexture(fV, V);
        bindFramebufferTexture(fW, W);
        bindFramebufferTexture(fC, C);
        bindFramebufferTexture(fD, D);
        bindFramebufferTexture(fE, E);
        bindFramebufferTexture(fF, F);

        randomize();
    };

    function loop() {
        if (!running) return;
        const now = performance.now();
        const dtRaw = now - last;
        last = now;
        const dt = Number.isFinite(dtRaw) && dtRaw > 0 ? dtRaw : 16.6667;
        timestepSeconds = Math.min(0.05, Math.max(1 / 240, dt / 1000));
        const controls = sanitizeSimulationControls(getControls?.() ?? defaultSimulationControls);

        const instantaneousFps = 1000 / dt;
        const seededFps = Number.isFinite(fpsSmooth) ? fpsSmooth : instantaneousFps;
        fpsSmooth = seededFps * 0.9 + instantaneousFps * 0.1;
        const safeFps = Number.isFinite(fpsSmooth) ? fpsSmooth : 0;
        frameIndex += 1;
        logPerfProbeFrame(dt);

        setFps?.(safeFps);
        setPups?.(safeFps * canvas.width * canvas.height);

        if (!controls.paused) {
            pass(densityProgram, [A], fC, now);
            pass(blurProgram, [C], fD, now);
            pass(wellsProgram, [E, D], fF, now);
            pass(gravityProgram, [D, F], fB, now);
            pass(velocityProgram, [V, B], fW, now);
            pass(advectProgram, [A, W], fD, now);
            pass(lifeProgram, [D], fA, now);

            [V, W] = [W, V];
            bindFramebufferTexture(fV, V);
            bindFramebufferTexture(fW, W);

            [E, F] = [F, E];
            bindFramebufferTexture(fE, E);
            bindFramebufferTexture(fF, F);
        }

        pass(displayProgram, [A, B, V, E], null, now);

        metricFrameCounter += 1;
        if (objectiveMetricsEnabled && metricFrameCounter >= metricsSampleIntervalFrames) {
            lastMetricsDurationMs = sampleMetrics();
            lastMetricsFrame = frameIndex;
            if (perfProbeEnabled) {
                console.info(
                    `[perf-probe] objective metrics sampled in ${lastMetricsDurationMs.toFixed(2)}ms ` +
                    `at frame ${frameIndex}`
                );
            }
            metricFrameCounter = 0;
        }

        rafId = requestAnimationFrame(loop);
    }

    loop();

    return {
        stop: () => {
            if (disposed) return;
            disposed = true;
            running = false;
            cancelAnimationFrame(rafId);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindVertexArray(null);

            textures().forEach((texture) => gl.deleteTexture(texture));
            gl.deleteTexture(uploadTexture);
            framebuffers.forEach((fb) => gl.deleteFramebuffer(fb));
            programs.forEach((program) => gl.deleteProgram(program));
            gl.deleteBuffer(vbo);
            gl.deleteVertexArray(vao);
        },
        randomize,
        resize,
        captureSnapshot: () => ({
            width: canvas.width,
            height: canvas.height,
            state: readFramebuffer(fA),
            force: readFramebuffer(fB),
            velocity: readFramebuffer(fV),
            wells: readFramebuffer(fE),
        }),
        restoreSnapshot: (snapshot: LifeEngineSnapshot) => {
            if (snapshot.width !== canvas.width || snapshot.height !== canvas.height) {
                resize(snapshot.width, snapshot.height);
            }

            uploadToTexture(A, fA, snapshot.state, false);
            uploadToTexture(D, fD, snapshot.state, false);

            uploadToTexture(B, fB, snapshot.force, useFloatForDynamics);

            uploadToTexture(V, fV, snapshot.velocity, useFloatForDynamics);
            uploadToTexture(W, fW, snapshot.velocity, useFloatForDynamics);

            uploadToTexture(E, fE, snapshot.wells, false);
            uploadToTexture(F, fF, snapshot.wells, false);
        },
    };
}
