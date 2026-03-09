export interface BlackHoleControl {
    enabled: boolean;
    mass: number;
    x: number;
    y: number;
    spin: number;
}

export interface SimulationControls {
    paused: boolean;
    lifeEnabled: boolean;
    gravityStrength: number;
    blackHoles: BlackHoleControl[];
    blackHoleEnabled: boolean;
    blackHoleMass: number;
    blackHoleX: number;
    blackHoleY: number;
    blackHoleSpin: number;
    blackHole2Enabled: boolean;
    blackHole2Mass: number;
    blackHole2X: number;
    blackHole2Y: number;
    blackHole2Spin: number;
    blackHole3Enabled: boolean;
    blackHole3Mass: number;
    blackHole3X: number;
    blackHole3Y: number;
    blackHole3Spin: number;
    gravitySoftening: number;
    eventHorizonRadius: number;
    whiteHoleMass: number;
    whiteHoleX: number;
    whiteHoleY: number;
    whiteHoleRadius: number;
    whiteHoleEmission: number;
    whiteHoleEnabled: boolean;
    redshiftStrength: number;
    spectralRenderingEnabled: boolean;
    spectralShiftStrength: number;
    spectralSpeedReference: number;
    spectralViewAngle: number;
    spectralHueOffset: number;
    spectralHueSpan: number;
    spectralSaturation: number;
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
    holeBrownianStrength: number;
    holeRearrangeBurst: number;
    holeSeparationForce: number;
    holeWeakAttraction: number;
    holePreferredSpacing: number;
    holeOrbitCoupling: number;
    holeDepthSeparation: number;
    holeEnergyFloor: number;
    holeCrowdingMomentum: number;
    autoMaxBlackHoles: boolean;
}

export interface ObjectiveMetrics {
    aliveRatio: number;
    neighborHarmony: number;
    avgVelocity: number;
    objectiveScore: number;
}

export const MAX_BLACK_HOLES = 16;

const defaultBlackHoles: BlackHoleControl[] = [
    {
        enabled: true,
        mass: 2.4,
        x: 0.5,
        y: 0.5,
        spin: 0.25,
    },
    {
        enabled: true,
        mass: 1.1,
        x: 0.72,
        y: 0.34,
        spin: -0.2,
    },
    {
        enabled: true,
        mass: 0.9,
        x: 0.28,
        y: 0.26,
        spin: 0.12,
    },
];

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const hasLegacyBlackHoleOverrides = (partial: Partial<SimulationControls>) =>
    hasOwn(partial, 'blackHoleEnabled') ||
    hasOwn(partial, 'blackHoleMass') ||
    hasOwn(partial, 'blackHoleX') ||
    hasOwn(partial, 'blackHoleY') ||
    hasOwn(partial, 'blackHoleSpin') ||
    hasOwn(partial, 'blackHole2Enabled') ||
    hasOwn(partial, 'blackHole2Mass') ||
    hasOwn(partial, 'blackHole2X') ||
    hasOwn(partial, 'blackHole2Y') ||
    hasOwn(partial, 'blackHole2Spin') ||
    hasOwn(partial, 'blackHole3Enabled') ||
    hasOwn(partial, 'blackHole3Mass') ||
    hasOwn(partial, 'blackHole3X') ||
    hasOwn(partial, 'blackHole3Y') ||
    hasOwn(partial, 'blackHole3Spin');

export const defaultSimulationControls: SimulationControls = {
    paused: false,
    lifeEnabled: true,
    gravityStrength: 0.32,
    blackHoles: defaultBlackHoles,
    blackHoleEnabled: true,
    blackHoleMass: 2.4,
    blackHoleX: 0.5,
    blackHoleY: 0.5,
    blackHoleSpin: 0.25,
    blackHole2Enabled: true,
    blackHole2Mass: 1.1,
    blackHole2X: 0.72,
    blackHole2Y: 0.34,
    blackHole2Spin: -0.2,
    blackHole3Enabled: true,
    blackHole3Mass: 0.9,
    blackHole3X: 0.28,
    blackHole3Y: 0.26,
    blackHole3Spin: 0.12,
    gravitySoftening: 1.4,
    eventHorizonRadius: 0.018,
    whiteHoleMass: 1.35,
    whiteHoleX: 0.22,
    whiteHoleY: 0.78,
    whiteHoleRadius: 0.03,
    whiteHoleEmission: 0.08,
    whiteHoleEnabled: false,
    redshiftStrength: 0.75,
    spectralRenderingEnabled: true,
    spectralShiftStrength: 1.15,
    spectralSpeedReference: 0.4,
    spectralViewAngle: 0,
    spectralHueOffset: 0,
    spectralHueSpan: 1,
    spectralSaturation: 1,
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
    holeBrownianStrength: 0.24,
    holeRearrangeBurst: 0.22,
    holeSeparationForce: 0.85,
    holeWeakAttraction: 0.42,
    holePreferredSpacing: 0.18,
    holeOrbitCoupling: 0.34,
    holeDepthSeparation: 0.62,
    holeEnergyFloor: 0.42,
    holeCrowdingMomentum: 0.68,
    autoMaxBlackHoles: false,
};

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

const sanitizeBlackHoleControl = (
    partial: Partial<BlackHoleControl> | undefined,
    fallback: BlackHoleControl
): BlackHoleControl => ({
    enabled: partial?.enabled ?? fallback.enabled,
    mass: clamp(partial?.mass ?? fallback.mass, 0, 4),
    x: clamp(partial?.x ?? fallback.x, 0, 1),
    y: clamp(partial?.y ?? fallback.y, 0, 1),
    spin: clamp(partial?.spin ?? fallback.spin, -1, 1),
});

const sanitizeBlackHoles = (partial: Partial<SimulationControls>): BlackHoleControl[] => {
    const fromArray = Array.isArray(partial.blackHoles)
        ? partial.blackHoles.slice(0, MAX_BLACK_HOLES)
        : defaultBlackHoles;

    const base = fromArray.length > 0
        ? fromArray.map((hole, index) =>
            sanitizeBlackHoleControl(hole, defaultBlackHoles[index] ?? defaultBlackHoles[0])
        )
        : defaultBlackHoles.map(hole => ({ ...hole }));

    while (base.length < 1) {
        base.push({ ...defaultBlackHoles[0] });
    }

    if (hasLegacyBlackHoleOverrides(partial)) {
        base[0] = sanitizeBlackHoleControl({
            enabled: partial.blackHoleEnabled,
            mass: partial.blackHoleMass,
            x: partial.blackHoleX,
            y: partial.blackHoleY,
            spin: partial.blackHoleSpin,
        }, base[0]);

        base[1] = sanitizeBlackHoleControl({
            enabled: partial.blackHole2Enabled,
            mass: partial.blackHole2Mass,
            x: partial.blackHole2X,
            y: partial.blackHole2Y,
            spin: partial.blackHole2Spin,
        }, base[1]);

        base[2] = sanitizeBlackHoleControl({
            enabled: partial.blackHole3Enabled,
            mass: partial.blackHole3Mass,
            x: partial.blackHole3X,
            y: partial.blackHole3Y,
            spin: partial.blackHole3Spin,
        }, base[2]);
    }

    const enabledHoles = base.filter((hole) => hole.enabled);
    if (enabledHoles.length > 0) {
        return enabledHoles;
    }

    return [{ ...defaultBlackHoles[0], enabled: true }];
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

    const blackHoles = sanitizeBlackHoles(partial);
    const black1 = blackHoles[0] ?? defaultBlackHoles[0];
    const black2 = blackHoles[1] ?? {
        ...defaultBlackHoles[1],
        enabled: false,
        mass: 0,
    };
    const black3 = blackHoles[2] ?? {
        ...defaultBlackHoles[2],
        enabled: false,
        mass: 0,
    };

    const sanitized: SimulationControls = {
        paused: partial.paused ?? defaultSimulationControls.paused,
        lifeEnabled: partial.lifeEnabled ?? defaultSimulationControls.lifeEnabled,
        gravityStrength: clamp(
            partial.gravityStrength ?? defaultSimulationControls.gravityStrength,
            0,
            1
        ),
        blackHoles,
        blackHoleEnabled: black1.enabled,
        blackHoleMass: clamp(
            black1.mass,
            0.1,
            4
        ),
        blackHoleX: clamp(
            black1.x,
            0,
            1
        ),
        blackHoleY: clamp(
            black1.y,
            0,
            1
        ),
        blackHoleSpin: clamp(
            black1.spin,
            -1,
            1
        ),
        blackHole2Enabled: black2.enabled,
        blackHole2Mass: clamp(
            black2.mass,
            0,
            4
        ),
        blackHole2X: clamp(
            black2.x,
            0,
            1
        ),
        blackHole2Y: clamp(
            black2.y,
            0,
            1
        ),
        blackHole2Spin: clamp(
            black2.spin,
            -1,
            1
        ),
        blackHole3Enabled: black3.enabled,
        blackHole3Mass: clamp(
            black3.mass,
            0,
            4
        ),
        blackHole3X: clamp(
            black3.x,
            0,
            1
        ),
        blackHole3Y: clamp(
            black3.y,
            0,
            1
        ),
        blackHole3Spin: clamp(
            black3.spin,
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
        whiteHoleEnabled: partial.whiteHoleEnabled ?? defaultSimulationControls.whiteHoleEnabled,
        redshiftStrength: clamp(
            partial.redshiftStrength ?? defaultSimulationControls.redshiftStrength,
            0,
            1.5
        ),
        spectralRenderingEnabled:
            partial.spectralRenderingEnabled ?? defaultSimulationControls.spectralRenderingEnabled,
        spectralShiftStrength: clamp(
            partial.spectralShiftStrength ?? defaultSimulationControls.spectralShiftStrength,
            0,
            3
        ),
        spectralSpeedReference: clamp(
            partial.spectralSpeedReference ?? defaultSimulationControls.spectralSpeedReference,
            0.05,
            1
        ),
        spectralViewAngle: clamp(
            partial.spectralViewAngle ?? defaultSimulationControls.spectralViewAngle,
            0,
            360
        ),
        spectralHueOffset: clamp(
            partial.spectralHueOffset ?? defaultSimulationControls.spectralHueOffset,
            0,
            1
        ),
        spectralHueSpan: clamp(
            partial.spectralHueSpan ?? defaultSimulationControls.spectralHueSpan,
            0.05,
            1
        ),
        spectralSaturation: clamp(
            partial.spectralSaturation ?? defaultSimulationControls.spectralSaturation,
            0,
            1
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
        holeBrownianStrength: clamp(
            partial.holeBrownianStrength ?? defaultSimulationControls.holeBrownianStrength,
            0,
            1
        ),
        holeRearrangeBurst: clamp(
            partial.holeRearrangeBurst ?? defaultSimulationControls.holeRearrangeBurst,
            0,
            2
        ),
        holeSeparationForce: clamp(
            partial.holeSeparationForce ?? defaultSimulationControls.holeSeparationForce,
            0,
            2
        ),
        holeWeakAttraction: clamp(
            partial.holeWeakAttraction ?? defaultSimulationControls.holeWeakAttraction,
            0,
            2
        ),
        holePreferredSpacing: clamp(
            partial.holePreferredSpacing ?? defaultSimulationControls.holePreferredSpacing,
            0.02,
            0.45
        ),
        holeOrbitCoupling: clamp(
            partial.holeOrbitCoupling ?? defaultSimulationControls.holeOrbitCoupling,
            0,
            2
        ),
        holeDepthSeparation: clamp(
            partial.holeDepthSeparation ?? defaultSimulationControls.holeDepthSeparation,
            0,
            2
        ),
        holeEnergyFloor: clamp(
            partial.holeEnergyFloor ?? defaultSimulationControls.holeEnergyFloor,
            0,
            1
        ),
        holeCrowdingMomentum: clamp(
            partial.holeCrowdingMomentum ?? defaultSimulationControls.holeCrowdingMomentum,
            0,
            2
        ),
        autoMaxBlackHoles:
            partial.autoMaxBlackHoles ?? defaultSimulationControls.autoMaxBlackHoles,
    };

    return sanitized;
}
