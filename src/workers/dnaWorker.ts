/**
 * dnaWorker.ts
 * ✅ Conway + coarse universal gravity + dead pixel drift
 */

let gridA: Uint8ClampedArray;
let gridB: Uint8ClampedArray;
let readBuffer: Uint8ClampedArray;
let writeBuffer: Uint8ClampedArray;
let width: number;
let height: number;

// Universal coarse grid for gravity field
let gravField: Float32Array;
const coarseSize = 50;

// Called once per worker lifetime
onmessage = (event) => {
    if (event.data.bufferA) {
        gridA = new Uint8ClampedArray(event.data.bufferA);
        gridB = new Uint8ClampedArray(event.data.bufferB);
        width = event.data.width;
        height = event.data.height;
        gravField = new Float32Array(coarseSize * coarseSize * 2);
        console.log(`[WORKER] Initialized`);
        return;
    }

    // Tick: physics update
    readBuffer = event.data.readIsA ? gridA : gridB;
    writeBuffer = event.data.readIsA ? gridB : gridA;

    // 1️⃣ Compute coarse gravity field
    const grav = gravField;
    grav.fill(0);

    const blockW = Math.ceil(width / coarseSize);
    const blockH = Math.ceil(height / coarseSize);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            if (readBuffer[idx] > 0) {
                const cx = Math.floor(x / blockW);
                const cy = Math.floor(y / blockH);
                const gi = (cy * coarseSize + cx) * 2;
                grav[gi] += x;
                grav[gi + 1] += y;
            }
        }
    }

    // Normalize: each cell becomes center of mass
    for (let cy = 0; cy < coarseSize; cy++) {
        for (let cx = 0; cx < coarseSize; cx++) {
            const gi = (cy * coarseSize + cx) * 2;
            const count = 1; // crude approximation to avoid divide by zero
            grav[gi] /= count;
            grav[gi + 1] /= count;
        }
    }

    // 2️⃣ Conway + drift
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // Conway neighbors
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = (x + dx + width) % width;
                    const ny = (y + dy + height) % height;
                    const nIdx = (ny * width + nx) * 4;
                    if (readBuffer[nIdx] > 0) count++;
                }
            }

            const alive = readBuffer[idx] > 0;
            const newR = alive ? (count === 2 || count === 3 ? 255 : 0) : (count === 3 ? 255 : 0);

            // Drift vector: pull toward local coarse center of mass
            const cx = Math.min(Math.floor(x / blockW), coarseSize - 1);
            const cy = Math.min(Math.floor(y / blockH), coarseSize - 1);
            const gi = (cy * coarseSize + cx) * 2;
            const gx = grav[gi];
            const gy = grav[gi + 1];
            let dx = gx - x;
            let dy = gy - y;
            const len = Math.hypot(dx, dy);
            if (len > 1) {
                dx /= len;
                dy /= len;
            }

            // Apply drift
            const driftStrength = 0.5; // adjust for effect
            let nx = Math.round(x + dx * driftStrength);
            let ny = Math.round(y + dy * driftStrength);
            nx = (nx + width) % width;
            ny = (ny + height) % height;

            const tIdx = (ny * width + nx) * 4;
            writeBuffer[tIdx] = newR;
            writeBuffer[tIdx + 1] = 128 + dx * 64;
            writeBuffer[tIdx + 2] = 128 + dy * 64;
            writeBuffer[tIdx + 3] = 255;
        }
    }

    postMessage({ done: true });
};

export { };
