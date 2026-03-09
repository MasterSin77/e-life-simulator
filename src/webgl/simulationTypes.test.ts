import {
    defaultSimulationControls,
    MAX_BLACK_HOLES,
    sanitizeSimulationControls,
} from './simulationTypes';

describe('sanitizeSimulationControls', () => {
    it('fills missing values with defaults', () => {
        const controls = sanitizeSimulationControls({});
        expect(controls).toEqual(defaultSimulationControls);
    });

    it('clamps out-of-range values', () => {
        const controls = sanitizeSimulationControls({
            gravityStrength: 5,
            blackHoleMass: 999,
            blackHoleX: -10,
            blackHoleY: 10,
            blackHoleSpin: 99,
            blackHole2Mass: 999,
            blackHole2X: -10,
            blackHole2Y: 10,
            blackHole2Spin: -99,
            gravitySoftening: 0,
            eventHorizonRadius: 1,
            whiteHoleMass: 999,
            whiteHoleX: -10,
            whiteHoleY: 10,
            whiteHoleRadius: 1,
            whiteHoleEmission: 1,
            redshiftStrength: 10,
            spectralShiftStrength: 10,
            spectralSpeedReference: 0,
            spectralViewAngle: 999,
            spectralHueOffset: 5,
            spectralHueSpan: 0,
            spectralSaturation: 2,
            driftDamping: 0,
            lifeUpdateRate: 99,
            denseMassCutoff: 0,
            lifeDecayRate: 99,
            lifeBirthMin: -3,
            lifeBirthMax: 42,
            lifeSurvivalMin: 9,
            lifeSurvivalMax: -1,
            lifeTransportRetention: 4,
            advectionStrength: -2,
            seedDensity: 1,
            showGravityField: true,
            wellGlowDensity: 4,
            wellGlowDistance: 4,
            holeBrownianStrength: 4,
            holeRearrangeBurst: 4,
            holeSeparationForce: 4,
            holeWeakAttraction: 4,
            holePreferredSpacing: 1,
            holeOrbitCoupling: 4,
            holeDepthSeparation: 4,
            holeEnergyFloor: 4,
            holeCrowdingMomentum: 4,
        });

        expect(controls.gravityStrength).toBe(1);
        expect(controls.blackHoleMass).toBe(4);
        expect(controls.blackHoleX).toBe(0);
        expect(controls.blackHoleY).toBe(1);
        expect(controls.blackHoleSpin).toBe(1);
        expect(controls.blackHole2Mass).toBe(4);
        expect(controls.blackHole2X).toBeGreaterThanOrEqual(0);
        expect(controls.blackHole2X).toBeLessThanOrEqual(1);
        expect(controls.blackHole2Y).toBeGreaterThanOrEqual(0);
        expect(controls.blackHole2Y).toBeLessThanOrEqual(1);
        expect(controls.blackHole2Spin).toBe(-1);
        expect(controls.gravitySoftening).toBe(0.2);
        expect(controls.eventHorizonRadius).toBe(0.1);
        expect(controls.whiteHoleMass).toBe(4);
        expect(controls.whiteHoleX).toBeGreaterThanOrEqual(0);
        expect(controls.whiteHoleX).toBeLessThanOrEqual(1);
        expect(controls.whiteHoleY).toBeGreaterThanOrEqual(0);
        expect(controls.whiteHoleY).toBeLessThanOrEqual(1);
        expect(controls.whiteHoleRadius).toBe(0.15);
        expect(controls.whiteHoleEmission).toBe(0.4);
        expect(controls.redshiftStrength).toBe(1.5);
        expect(controls.spectralShiftStrength).toBe(3);
        expect(controls.spectralSpeedReference).toBe(0.05);
        expect(controls.spectralViewAngle).toBe(360);
        expect(controls.spectralHueOffset).toBe(1);
        expect(controls.spectralHueSpan).toBe(0.05);
        expect(controls.spectralSaturation).toBe(1);
        expect(controls.driftDamping).toBe(0.8);
        expect(controls.lifeUpdateRate).toBe(1);
        expect(controls.denseMassCutoff).toBe(0.5);
        expect(controls.lifeDecayRate).toBe(1);
        expect(controls.lifeBirthMin).toBe(0);
        expect(controls.lifeBirthMax).toBe(8);
        expect(controls.lifeSurvivalMin).toBe(0);
        expect(controls.lifeSurvivalMax).toBe(8);
        expect(controls.lifeTransportRetention).toBe(1);
        expect(controls.advectionStrength).toBe(0);
        expect(controls.seedDensity).toBe(0.5);
        expect(controls.showGravityField).toBe(true);
        expect(controls.wellGlowDensity).toBe(1);
        expect(controls.wellGlowDistance).toBe(1);
        expect(controls.holeBrownianStrength).toBe(1);
        expect(controls.holeRearrangeBurst).toBe(2);
        expect(controls.holeSeparationForce).toBe(2);
        expect(controls.holeWeakAttraction).toBe(2);
        expect(controls.holePreferredSpacing).toBe(0.45);
        expect(controls.holeOrbitCoupling).toBe(2);
        expect(controls.holeDepthSeparation).toBe(2);
        expect(controls.holeEnergyFloor).toBe(1);
        expect(controls.holeCrowdingMomentum).toBe(2);
    });

    it('clamps advection upper range', () => {
        const controls = sanitizeSimulationControls({ advectionStrength: 999 });
        expect(controls.advectionStrength).toBe(12);
    });

    it('keeps valid values unchanged', () => {
        const controls = sanitizeSimulationControls({
            paused: true,
            lifeEnabled: false,
            gravityStrength: 0.12,
            blackHoleMass: 1.9,
            blackHoleX: 0.52,
            blackHoleY: 0.48,
            blackHoleSpin: 0.34,
            blackHole2Mass: 1.1,
            blackHole2X: 0.67,
            blackHole2Y: 0.31,
            blackHole2Spin: -0.41,
            gravitySoftening: 1.1,
            eventHorizonRadius: 0.02,
            whiteHoleMass: 1.2,
            whiteHoleX: 0.31,
            whiteHoleY: 0.66,
            whiteHoleRadius: 0.024,
            whiteHoleEmission: 0.07,
            redshiftStrength: 0.85,
            spectralShiftStrength: 1.6,
            spectralSpeedReference: 0.55,
            spectralViewAngle: 127,
            spectralHueOffset: 0.25,
            spectralHueSpan: 0.92,
            spectralSaturation: 0.88,
            driftDamping: 0.93,
            lifeUpdateRate: 0.58,
            denseMassCutoff: 0.81,
            lifeDecayRate: 0.73,
            lifeBirthMin: 3,
            lifeBirthMax: 4,
            lifeSurvivalMin: 2,
            lifeSurvivalMax: 5,
            lifeTransportRetention: 0.67,
            advectionStrength: 1.5,
            seedDensity: 0.08,
            showGravityField: false,
            wellGlowDensity: 0.4,
            wellGlowDistance: 0.3,
            holeBrownianStrength: 0.22,
            holeRearrangeBurst: 0.4,
            holeSeparationForce: 0.76,
            holeWeakAttraction: 0.51,
            holePreferredSpacing: 0.2,
            holeOrbitCoupling: 0.7,
            holeDepthSeparation: 0.64,
            holeEnergyFloor: 0.45,
            holeCrowdingMomentum: 0.63,
        });

        expect(controls.paused).toBe(true);
        expect(controls.lifeEnabled).toBe(false);
        expect(controls.gravityStrength).toBeCloseTo(0.12);
        expect(controls.blackHoleMass).toBeCloseTo(1.9);
        expect(controls.blackHoleX).toBeCloseTo(0.52);
        expect(controls.blackHoleY).toBeCloseTo(0.48);
        expect(controls.blackHoleSpin).toBeCloseTo(0.34);
        expect(controls.blackHole2Mass).toBeCloseTo(1.1);
        expect(controls.blackHole2X).toBeCloseTo(0.67);
        expect(controls.blackHole2Y).toBeCloseTo(0.31);
        expect(controls.blackHole2Spin).toBeCloseTo(-0.41);
        expect(controls.gravitySoftening).toBeCloseTo(1.1);
        expect(controls.eventHorizonRadius).toBeCloseTo(0.02);
        expect(controls.whiteHoleMass).toBeCloseTo(1.2);
        expect(controls.whiteHoleX).toBeCloseTo(0.31);
        expect(controls.whiteHoleY).toBeCloseTo(0.66);
        expect(controls.whiteHoleRadius).toBeCloseTo(0.024);
        expect(controls.whiteHoleEmission).toBeCloseTo(0.07);
        expect(controls.redshiftStrength).toBeCloseTo(0.85);
        expect(controls.spectralShiftStrength).toBeCloseTo(1.6);
        expect(controls.spectralSpeedReference).toBeCloseTo(0.55);
        expect(controls.spectralViewAngle).toBeCloseTo(127);
        expect(controls.spectralHueOffset).toBeCloseTo(0.25);
        expect(controls.spectralHueSpan).toBeCloseTo(0.92);
        expect(controls.spectralSaturation).toBeCloseTo(0.88);
        expect(controls.driftDamping).toBeCloseTo(0.93);
        expect(controls.lifeUpdateRate).toBeCloseTo(0.58);
        expect(controls.denseMassCutoff).toBeCloseTo(0.81);
        expect(controls.lifeDecayRate).toBeCloseTo(0.73);
        expect(controls.lifeBirthMin).toBe(3);
        expect(controls.lifeBirthMax).toBe(4);
        expect(controls.lifeSurvivalMin).toBe(2);
        expect(controls.lifeSurvivalMax).toBe(5);
        expect(controls.lifeTransportRetention).toBeCloseTo(0.67);
        expect(controls.advectionStrength).toBeCloseTo(1.5);
        expect(controls.seedDensity).toBeCloseTo(0.08);
        expect(controls.showGravityField).toBe(false);
        expect(controls.wellGlowDensity).toBeCloseTo(0.4);
        expect(controls.wellGlowDistance).toBeCloseTo(0.3);
        expect(controls.holeBrownianStrength).toBeCloseTo(0.22);
        expect(controls.holeRearrangeBurst).toBeCloseTo(0.4);
        expect(controls.holeSeparationForce).toBeCloseTo(0.76);
        expect(controls.holeWeakAttraction).toBeCloseTo(0.51);
        expect(controls.holePreferredSpacing).toBeCloseTo(0.2);
        expect(controls.holeOrbitCoupling).toBeCloseTo(0.7);
        expect(controls.holeDepthSeparation).toBeCloseTo(0.64);
        expect(controls.holeEnergyFloor).toBeCloseTo(0.45);
        expect(controls.holeCrowdingMomentum).toBeCloseTo(0.63);
    });

    it('normalizes Conway windows and rounds to integer neighbor counts', () => {
        const controls = sanitizeSimulationControls({
            lifeBirthMin: 5.8,
            lifeBirthMax: 2.1,
            lifeSurvivalMin: 7.9,
            lifeSurvivalMax: 2.2,
        });

        expect(controls.lifeBirthMin).toBe(2);
        expect(controls.lifeBirthMax).toBe(6);
        expect(controls.lifeSurvivalMin).toBe(2);
        expect(controls.lifeSurvivalMax).toBe(8);
    });

    it('keeps overlapping hole positions unchanged during sanitization', () => {
        const controls = sanitizeSimulationControls({
            blackHoleX: 0.5,
            blackHoleY: 0.5,
            blackHole2X: 0.5,
            blackHole2Y: 0.5,
            eventHorizonRadius: 0.04,
            whiteHoleRadius: 0.03,
            whiteHoleX: 0.5,
            whiteHoleY: 0.5,
            whiteHoleEnabled: true,
            blackHole3Enabled: true,
            blackHole3X: 0.5,
            blackHole3Y: 0.5,
        });

        expect(controls.blackHole2X).toBeCloseTo(0.5);
        expect(controls.blackHole2Y).toBeCloseTo(0.5);
        expect(controls.blackHole3X).toBeCloseTo(0.5);
        expect(controls.blackHole3Y).toBeCloseTo(0.5);
        expect(controls.whiteHoleX).toBeCloseTo(0.5);
        expect(controls.whiteHoleY).toBeCloseTo(0.5);
    });

    it('sanitizes array-based black hole controls and keeps legacy fields in sync', () => {
        const controls = sanitizeSimulationControls({
            blackHoles: [
                { enabled: true, mass: 9, x: -1, y: 2, spin: 4 },
                { enabled: false, mass: 1.8, x: 0.2, y: 0.3, spin: -0.25 },
            ],
        });

        expect(controls.blackHoles[0].mass).toBe(4);
        expect(controls.blackHoles[0].x).toBe(0);
        expect(controls.blackHoles[0].y).toBe(1);
        expect(controls.blackHoles[0].spin).toBe(1);
        expect(controls.blackHoles.length).toBe(1);
        expect(controls.blackHoleEnabled).toBe(true);
        expect(controls.blackHoleMass).toBe(4);
        expect(controls.blackHoleX).toBe(0);
        expect(controls.blackHoleY).toBe(1);
        expect(controls.blackHole2Enabled).toBe(false);
        expect(controls.blackHole2Mass).toBe(0);
        expect(controls.blackHole3Enabled).toBe(false);
        expect(controls.blackHole3Mass).toBe(0);
    });

    it('applies legacy black hole fields as overrides onto black hole arrays', () => {
        const controls = sanitizeSimulationControls({
            blackHoles: [
                { enabled: true, mass: 1.0, x: 0.1, y: 0.2, spin: 0.3 },
                { enabled: true, mass: 1.1, x: 0.2, y: 0.3, spin: 0.4 },
                { enabled: true, mass: 1.2, x: 0.3, y: 0.4, spin: 0.5 },
            ],
            blackHole2Enabled: false,
            blackHole2Mass: 3.2,
            blackHole2X: 0.77,
            blackHole2Y: 0.66,
            blackHole2Spin: -0.75,
        });

        expect(controls.blackHoles).toHaveLength(2);
        expect(controls.blackHoles[0].x).toBeCloseTo(0.1);
        expect(controls.blackHoles[1].x).toBeCloseTo(0.3);
        expect(controls.blackHole2Enabled).toBe(true);
        expect(controls.blackHole2X).toBeCloseTo(0.3);
    });

    it('removes disabled holes from persisted arrays but keeps one active hole minimum', () => {
        const controls = sanitizeSimulationControls({
            blackHoles: [
                { enabled: false, mass: 1.0, x: 0.1, y: 0.2, spin: 0.3 },
                { enabled: false, mass: 1.1, x: 0.2, y: 0.3, spin: 0.4 },
            ],
        });

        expect(controls.blackHoles).toHaveLength(1);
        expect(controls.blackHoles[0].enabled).toBe(true);
    });

    it('caps black-hole arrays to MAX_BLACK_HOLES for runtime safety', () => {
        const manyHoles = Array.from({ length: MAX_BLACK_HOLES + 10 }, (_, index) => ({
            enabled: true,
            mass: 1,
            x: (index * 0.031) % 1,
            y: (index * 0.071) % 1,
            spin: 0,
        }));

        const controls = sanitizeSimulationControls({ blackHoles: manyHoles });
        expect(controls.blackHoles).toHaveLength(MAX_BLACK_HOLES);
    });
});
