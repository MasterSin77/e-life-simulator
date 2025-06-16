export default class SimulationEngine {
  width: number;
  height: number;
  gridA: Uint8ClampedArray;
  gridB: Uint8ClampedArray;
  readBuffer: Uint8ClampedArray;
  writeBuffer: Uint8ClampedArray;

  workers: Worker[] = [];
  numWorkers: number = 1;
  pending = 0;
  workerTimings: number[] = [];
  isUpdating = false;

  coarseGrid: Float32Array;
  coarseCols: number;
  coarseRows: number;

  _currentCallback: (() => void) | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.gridA = new Uint8ClampedArray(0);
    this.gridB = new Uint8ClampedArray(0);
    this.readBuffer = this.gridA;
    this.writeBuffer = this.gridB;

    this.coarseCols = 50;
    this.coarseRows = 50;
    this.coarseGrid = new Float32Array(this.coarseCols * this.coarseRows * 2);

    this.initBuffers(width, height);
    this.spawnWorkers();
  }

  initBuffers(width: number, height: number) {
    const bpp = 4;
    const bufferA = new SharedArrayBuffer(width * height * bpp);
    const bufferB = new SharedArrayBuffer(width * height * bpp);

    this.gridA = new Uint8ClampedArray(bufferA);
    this.gridB = new Uint8ClampedArray(bufferB);
    this.readBuffer = this.gridA;
    this.writeBuffer = this.gridB;

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      this.gridA[idx] = Math.random() > 0.8 ? 255 : 0; // R
      this.gridA[idx + 1] = 128; // vx
      this.gridA[idx + 2] = 128; // vy
      this.gridA[idx + 3] = 255; // alpha
      this.gridB.set(this.gridA.subarray(idx, idx + 4), idx);
    }

    this.numWorkers = navigator.hardwareConcurrency || 4;
    this.workerTimings = new Array(this.numWorkers).fill(0);
  }

  spawnWorkers() {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new Worker(new URL('../workers/dnaWorker.ts', import.meta.url));
      worker.postMessage({
        bufferA: this.gridA.buffer,
        bufferB: this.gridB.buffer,
        width: this.width,
        height: this.height,
        coarseCols: this.coarseCols,
        coarseRows: this.coarseRows
      });
      this.workers.push(worker);
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initBuffers(width, height);
    this.spawnWorkers();
    console.log('[ENGINE] Resized grid:', width, height);
  }

  update(callback: () => void) {
    if (this.isUpdating) return;
    this.isUpdating = true;

    this.pending = this.numWorkers;
    this._currentCallback = callback;

    // simple chunk division
    const totalPixels = this.width * this.height;
    const chunkSize = Math.ceil(totalPixels / this.numWorkers);

    this.workers.forEach((worker, i) => {
      const startIdx = i * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, totalPixels);

      const start = performance.now();

      worker.onmessage = () => {
        this.workerTimings[i] = performance.now() - start;
        this.pending--;
        if (this.pending === 0) {
          [this.readBuffer, this.writeBuffer] = [this.writeBuffer, this.readBuffer];
          this.isUpdating = false;
          this._currentCallback?.();
          this._currentCallback = null;
        }
      };

      worker.postMessage({
        startIdx,
        endIdx,
        readIsA: this.readBuffer === this.gridA
      });
    });
  }

  getWorkerTimings() {
    return this.workerTimings;
  }
}
