import {
    defaultSimulationControls,
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
        expect(controls.whiteHoleX).toBe(0);
        expect(controls.whiteHoleY).toBe(1);
        expect(controls.whiteHoleRadius).toBe(0.15);
        expect(controls.whiteHoleEmission).toBe(0.4);
        expect(controls.redshiftStrength).toBe(1.5);
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
    });

    it('clamps advection upper range', () => {
        const controls = sanitizeSimulationControls({ advectionStrength: 999 });
        expect(controls.advectionStrength).toBe(12);
    });

    it('keeps valid values unchanged', () => {
        const controls = sanitizeSimulationControls({
            paused: true,
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
        });

        expect(controls.paused).toBe(true);
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

    it('enforces minimum black hole separation when overlapping', () => {
        const controls = sanitizeSimulationControls({
            blackHoleX: 0.5,
            blackHoleY: 0.5,
            blackHole2X: 0.5,
            blackHole2Y: 0.5,
            blackHole2Mass: 1.0,
            eventHorizonRadius: 0.05,
        });

        const distance = Math.hypot(
            controls.blackHole2X - controls.blackHoleX,
            controls.blackHole2Y - controls.blackHoleY
        );

        expect(distance).toBeGreaterThanOrEqual(0.05 * 2.2 - 1e-6);
    });

    it('does not move second black hole when already separated', () => {
        const controls = sanitizeSimulationControls({
            blackHoleX: 0.2,
            blackHoleY: 0.2,
            blackHole2X: 0.8,
            blackHole2Y: 0.8,
            blackHole2Mass: 1.2,
            eventHorizonRadius: 0.03,
        });

        expect(controls.blackHole2X).toBeCloseTo(0.8);
        expect(controls.blackHole2Y).toBeCloseTo(0.8);
    });
});
