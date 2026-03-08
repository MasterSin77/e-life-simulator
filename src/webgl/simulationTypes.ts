export interface SimulationControls {
    paused: boolean;
    gravityStrength: number;
    blackHoleMass: number;
    blackHoleX: number;
    blackHoleY: number;
    blackHoleSpin: number;
    blackHole2Mass: number;
    blackHole2X: number;
    blackHole2Y: number;
    blackHole2Spin: number;
    gravitySoftening: number;
    eventHorizonRadius: number;
    whiteHoleMass: number;
    whiteHoleX: number;
    whiteHoleY: number;
    whiteHoleRadius: number;
    whiteHoleEmission: number;
    redshiftStrength: number;
    showGravityField: boolean;
    driftDamping: number;
    lifeUpdateRate: number;
    denseMassCutoff: number;
    lifeDecayRate: number;
    lifeBirthMin: number;
    lifeBirthMax: number;
    lifeSurvivalMin: number;
    lifeSurvivalMax: number;
    lifeTransportRetention: number;
    advectionStrength: number;
    seedDensity: number;
    wellGlowDensity: number;
    wellGlowDistance: number;
}

export interface ObjectiveMetrics {
    aliveRatio: number;
    neighborHarmony: number;
    avgVelocity: number;
    objectiveScore: number;
}

export const defaultSimulationControls: SimulationControls = {
    paused: false,
    gravityStrength: 0.32,
    blackHoleMass: 2.4,
    blackHoleX: 0.5,
    blackHoleY: 0.5,
    blackHoleSpin: 0.25,
    blackHole2Mass: 1.1,
    blackHole2X: 0.72,
    blackHole2Y: 0.34,
    blackHole2Spin: -0.2,
    gravitySoftening: 1.4,
    eventHorizonRadius: 0.018,
    whiteHoleMass: 1.35,
    whiteHoleX: 0.22,
    whiteHoleY: 0.78,
    whiteHoleRadius: 0.03,
    whiteHoleEmission: 0.08,
    redshiftStrength: 0.75,
    showGravityField: true,
    driftDamping: 0.98,
    lifeUpdateRate: 0.62,
    denseMassCutoff: 0.78,
    lifeDecayRate: 0.9,
    lifeBirthMin: 3,
    lifeBirthMax: 3,
    lifeSurvivalMin: 2,
    lifeSurvivalMax: 3,
    lifeTransportRetention: 0.88,
    advectionStrength: 6.0,
    seedDensity: 0.05,
    wellGlowDensity: 0.45,
    wellGlowDistance: 0.32,
};

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

const enforceBlackHoleSeparation = (controls: SimulationControls): SimulationControls => {
    if (controls.blackHole2Mass <= 0.05) {
        return controls;
    }

    const minSeparation = controls.eventHorizonRadius * 2.2;
    const dx = controls.blackHole2X - controls.blackHoleX;
    const dy = controls.blackHole2Y - controls.blackHoleY;
    const distance = Math.hypot(dx, dy);

    if (distance >= minSeparation) {
        return controls;
    }

    const inv = distance > 1e-6 ? 1 / distance : 0;
    const dirX = distance > 1e-6 ? dx * inv : 0.8660254;
    const dirY = distance > 1e-6 ? dy * inv : 0.5;

    const separatedX = clamp(controls.blackHoleX + dirX * minSeparation, 0, 1);
    const separatedY = clamp(controls.blackHoleY + dirY * minSeparation, 0, 1);

    return {
        ...controls,
        blackHole2X: separatedX,
        blackHole2Y: separatedY,
    };
};

export function sanitizeSimulationControls(
    partial: Partial<SimulationControls>
): SimulationControls {
    const birthMinRaw = clamp(
        Math.round(partial.lifeBirthMin ?? defaultSimulationControls.lifeBirthMin),
        0,
        8
    );
    const birthMaxRaw = clamp(
        Math.round(partial.lifeBirthMax ?? defaultSimulationControls.lifeBirthMax),
        0,
        8
    );
    const survivalMinRaw = clamp(
        Math.round(partial.lifeSurvivalMin ?? defaultSimulationControls.lifeSurvivalMin),
        0,
        8
    );
    const survivalMaxRaw = clamp(
        Math.round(partial.lifeSurvivalMax ?? defaultSimulationControls.lifeSurvivalMax),
        0,
        8
    );

    const sanitized: SimulationControls = {
        paused: partial.paused ?? defaultSimulationControls.paused,
        gravityStrength: clamp(
            partial.gravityStrength ?? defaultSimulationControls.gravityStrength,
            0,
            1
        ),
        blackHoleMass: clamp(
            partial.blackHoleMass ?? defaultSimulationControls.blackHoleMass,
            0.1,
            4
        ),
        blackHoleX: clamp(
            partial.blackHoleX ?? defaultSimulationControls.blackHoleX,
            0,
            1
        ),
        blackHoleY: clamp(
            partial.blackHoleY ?? defaultSimulationControls.blackHoleY,
            0,
            1
        ),
        blackHoleSpin: clamp(
            partial.blackHoleSpin ?? defaultSimulationControls.blackHoleSpin,
            -1,
            1
        ),
        blackHole2Mass: clamp(
            partial.blackHole2Mass ?? defaultSimulationControls.blackHole2Mass,
            0,
            4
        ),
        blackHole2X: clamp(
            partial.blackHole2X ?? defaultSimulationControls.blackHole2X,
            0,
            1
        ),
        blackHole2Y: clamp(
            partial.blackHole2Y ?? defaultSimulationControls.blackHole2Y,
            0,
            1
        ),
        blackHole2Spin: clamp(
            partial.blackHole2Spin ?? defaultSimulationControls.blackHole2Spin,
            -1,
            1
        ),
        gravitySoftening: clamp(
            partial.gravitySoftening ?? defaultSimulationControls.gravitySoftening,
            0.2,
            4
        ),
        eventHorizonRadius: clamp(
            partial.eventHorizonRadius ?? defaultSimulationControls.eventHorizonRadius,
            0.005,
            0.1
        ),
        whiteHoleMass: clamp(
            partial.whiteHoleMass ?? defaultSimulationControls.whiteHoleMass,
            0,
            4
        ),
        whiteHoleX: clamp(
            partial.whiteHoleX ?? defaultSimulationControls.whiteHoleX,
            0,
            1
        ),
        whiteHoleY: clamp(
            partial.whiteHoleY ?? defaultSimulationControls.whiteHoleY,
            0,
            1
        ),
        whiteHoleRadius: clamp(
            partial.whiteHoleRadius ?? defaultSimulationControls.whiteHoleRadius,
            0.005,
            0.15
        ),
        whiteHoleEmission: clamp(
            partial.whiteHoleEmission ?? defaultSimulationControls.whiteHoleEmission,
            0,
            0.4
        ),
        redshiftStrength: clamp(
            partial.redshiftStrength ?? defaultSimulationControls.redshiftStrength,
            0,
            1.5
        ),
        showGravityField: partial.showGravityField ?? defaultSimulationControls.showGravityField,
        driftDamping: clamp(
            partial.driftDamping ?? defaultSimulationControls.driftDamping,
            0.8,
            1
        ),
        lifeUpdateRate: clamp(
            partial.lifeUpdateRate ?? defaultSimulationControls.lifeUpdateRate,
            0.15,
            1
        ),
        denseMassCutoff: clamp(
            partial.denseMassCutoff ?? defaultSimulationControls.denseMassCutoff,
            0.5,
            1
        ),
        lifeDecayRate: clamp(
            partial.lifeDecayRate ?? defaultSimulationControls.lifeDecayRate,
            0,
            1
        ),
        lifeBirthMin: Math.min(birthMinRaw, birthMaxRaw),
        lifeBirthMax: Math.max(birthMinRaw, birthMaxRaw),
        lifeSurvivalMin: Math.min(survivalMinRaw, survivalMaxRaw),
        lifeSurvivalMax: Math.max(survivalMinRaw, survivalMaxRaw),
        lifeTransportRetention: clamp(
            partial.lifeTransportRetention ?? defaultSimulationControls.lifeTransportRetention,
            0,
            1
        ),
        advectionStrength: clamp(
            partial.advectionStrength ?? defaultSimulationControls.advectionStrength,
            0,
            12
        ),
        seedDensity: clamp(
            partial.seedDensity ?? defaultSimulationControls.seedDensity,
            0.001,
            0.5
        ),
        wellGlowDensity: clamp(
            partial.wellGlowDensity ?? defaultSimulationControls.wellGlowDensity,
            0,
            1
        ),
        wellGlowDistance: clamp(
            partial.wellGlowDistance ?? defaultSimulationControls.wellGlowDistance,
            0,
            1
        ),
    };

    return enforceBlackHoleSeparation(sanitized);
}
