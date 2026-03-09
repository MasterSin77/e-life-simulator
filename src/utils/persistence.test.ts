import {
  defaultSimulationControls,
  sanitizeSimulationControls,
} from '../webgl/simulationTypes';
import {
  extractControlsFromPayload,
  toPersistedControls,
} from './persistence';

describe('persistence helpers', () => {
  it('extracts controls from either nested or top-level payloads', () => {
    const nested = extractControlsFromPayload({
      schema: 'e-life-controls-v1',
      controls: { gravityStrength: 0.42 },
    });
    const topLevel = extractControlsFromPayload({ gravityStrength: 0.31 });

    expect(nested.gravityStrength).toBeCloseTo(0.42);
    expect(topLevel.gravityStrength).toBeCloseTo(0.31);
  });

  it('writes canonical controls without legacy black-hole scalar fields', () => {
    const persisted = toPersistedControls(defaultSimulationControls);

    expect(Array.isArray(persisted.blackHoles)).toBe(true);
    expect('blackHoleMass' in (persisted as Record<string, unknown>)).toBe(false);
    expect('blackHole2Mass' in (persisted as Record<string, unknown>)).toBe(false);
    expect('blackHole3Mass' in (persisted as Record<string, unknown>)).toBe(false);
  });

  it('round-trips mixed legacy and array payloads via canonical writes', () => {
    const mixedPayload = {
      schema: 'e-life-controls-v1',
      controls: {
        blackHoles: [
          { enabled: true, mass: 0.9, x: 0.22, y: 0.33, spin: 0.1 },
          { enabled: true, mass: 1.0, x: 0.44, y: 0.55, spin: 0.2 },
          { enabled: true, mass: 1.1, x: 0.66, y: 0.77, spin: 0.3 },
        ],
        blackHole2Enabled: false,
        blackHole2Mass: 3.2,
        blackHole2X: 0.79,
        blackHole2Y: 0.68,
        blackHole2Spin: -0.75,
      },
    };

    const sanitizedFromMixed = sanitizeSimulationControls(
      extractControlsFromPayload(mixedPayload)
    );

    const persisted = toPersistedControls(sanitizedFromMixed);
    expect('blackHole2Mass' in (persisted as Record<string, unknown>)).toBe(false);
    expect(persisted.blackHoles).toHaveLength(2);
    expect(persisted.blackHoles[1].enabled).toBe(true);
    expect(persisted.blackHoles[1].mass).toBeCloseTo(1.1);

    const reloaded = sanitizeSimulationControls(
      extractControlsFromPayload({ controls: persisted })
    );

    expect(reloaded.blackHoles[1].enabled).toBe(true);
    expect(reloaded.blackHoles[1].mass).toBeCloseTo(1.1);
    expect(reloaded.blackHoles[1].x).toBeCloseTo(0.66);
    expect(reloaded.blackHoles[1].y).toBeCloseTo(0.77);
    expect(reloaded.blackHoles[1].spin).toBeCloseTo(0.3);
  });
});
