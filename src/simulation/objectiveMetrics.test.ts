import { computeObjectiveMetrics } from './objectiveMetrics';

const buildPixels = (
    width: number,
    height: number,
    alive: Set<string>,
    velocityValue = 128
) => {
    const state = new Uint8Array(width * height * 4);
    const velocity = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const isAlive = alive.has(`${x},${y}`);
            state[idx] = isAlive ? 255 : 0;
            state[idx + 1] = 0;
            state[idx + 2] = 0;
            state[idx + 3] = 255;

            velocity[idx] = velocityValue;
            velocity[idx + 1] = velocityValue;
            velocity[idx + 2] = 0;
            velocity[idx + 3] = 255;
        }
    }
    return { state, velocity };
};

describe('computeObjectiveMetrics', () => {
    it('returns zero metrics for empty dimensions', () => {
        const metrics = computeObjectiveMetrics(new Uint8Array(0), new Uint8Array(0), 0, 0);
        expect(metrics.aliveRatio).toBe(0);
        expect(metrics.objectiveScore).toBe(0);
    });

    it('calculates expected alive ratio for a known pattern', () => {
        const width = 4;
        const height = 4;
        const alive = new Set(['0,0', '1,0', '2,0', '3,3']);
        const { state, velocity } = buildPixels(width, height, alive);

        const metrics = computeObjectiveMetrics(state, velocity, width, height);
        expect(metrics.aliveRatio).toBeCloseTo(4 / 16, 5);
        expect(metrics.neighborHarmony).toBeGreaterThanOrEqual(0);
        expect(metrics.neighborHarmony).toBeLessThanOrEqual(1);
        expect(metrics.objectiveScore).toBeGreaterThanOrEqual(0);
        expect(metrics.objectiveScore).toBeLessThanOrEqual(1);
    });

    it('responds to velocity changes in avgVelocity', () => {
        const width = 2;
        const height = 2;
        const alive = new Set(['0,0']);
        const low = buildPixels(width, height, alive, 128);
        const high = buildPixels(width, height, alive, 255);

        const lowMetrics = computeObjectiveMetrics(low.state, low.velocity, width, height);
        const highMetrics = computeObjectiveMetrics(high.state, high.velocity, width, height);

        expect(highMetrics.avgVelocity).toBeGreaterThan(lowMetrics.avgVelocity);
    });
});
