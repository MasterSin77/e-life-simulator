import { ObjectiveMetrics } from '../webgl/simulationTypes';

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export function computeObjectiveMetrics(
    statePixels: Uint8Array,
    velocityPixels: Uint8Array,
    width: number,
    height: number
): ObjectiveMetrics {
    const total = width * height;
    if (total <= 0) {
        return {
            aliveRatio: 0,
            neighborHarmony: 0,
            avgVelocity: 0,
            objectiveScore: 0,
        };
    }

    let aliveCount = 0;
    let harmonySum = 0;
    let speedSum = 0;

    const readAlive = (x: number, y: number) => {
        const nx = (x + width) % width;
        const ny = (y + height) % height;
        const idx = (ny * width + nx) * 4;
        return statePixels[idx] > 127 ? 1 : 0;
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const alive = statePixels[idx] > 127 ? 1 : 0;
            aliveCount += alive;

            let neighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    neighbors += readAlive(x + dx, y + dy);
                }
            }
            harmonySum += 1 - Math.abs(neighbors - 3) / 5;

            const vx = velocityPixels[idx] / 255;
            const vy = velocityPixels[idx + 1] / 255;
            const speed = Math.hypot(vx * 2 - 1, vy * 2 - 1);
            speedSum += speed;
        }
    }

    const aliveRatio = aliveCount / total;
    const neighborHarmony = clamp01(harmonySum / total);
    const avgVelocity = speedSum / total;

    const aliveTarget = 1 - Math.min(1, Math.abs(aliveRatio - 0.18) / 0.18);
    const velocityTarget = 1 - Math.min(1, Math.abs(avgVelocity - 0.2) / 0.2);
    const objectiveScore = clamp01(
        aliveTarget * 0.4 + neighborHarmony * 0.35 + velocityTarget * 0.25
    );

    return {
        aliveRatio,
        neighborHarmony,
        avgVelocity,
        objectiveScore,
    };
}
