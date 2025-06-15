/**
 * dnaWorker.ts
 * ✅ Conway’s Life step for assigned chunk
 */

let gridA: Uint8Array;
let gridB: Uint8Array;
let width: number;
let height: number;

onmessage = (e) => {
    if (e.data.bufferA) {
        // Initial setup
        gridA = new Uint8Array(e.data.bufferA);
        gridB = new Uint8Array(e.data.bufferB);
        width = e.data.width;
        height = e.data.height;
    } else {
        // Work request
        const { startIdx, endIdx, readIsA } = e.data;
        const read = readIsA ? gridA : gridB;
        const write = readIsA ? gridB : gridA;

        for (let idx = startIdx; idx < endIdx; idx++) {
            const x = idx % width;
            const y = Math.floor(idx / width);

            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = ny * width + nx;
                        if (read[nIdx]) count++;
                    }
                }
            }

            const current = read[idx] ? 1 : 0;
            let next = 0;

            if (current) {
                next = count === 2 || count === 3 ? 1 : 0;
            } else {
                next = count === 3 ? 1 : 0;
            }

            write[idx] = next;
        }

        postMessage({});
    }
};

export { };
