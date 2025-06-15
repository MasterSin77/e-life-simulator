export default class SimulationEngine {
  width: number;
  height: number;
  gridA!: Uint8Array;
  gridB!: Uint8Array;
  readBuffer!: Uint8Array;
  writeBuffer!: Uint8Array;

  workers: Worker[] = [];
  numWorkers!: number;
  chunkSize!: number;
  pending = 0;
  workerTimings!: number[];
  isUpdating = false;

  _currentCallback: (() => void) | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initBuffers(width, height);
    this.spawnWorkers();
  }

  initBuffers(width: number, height: number) {
    const bufferA = new SharedArrayBuffer(width * height);
    const bufferB = new SharedArrayBuffer(width * height);

    this.gridA = new Uint8Array(bufferA);
    this.gridB = new Uint8Array(bufferB);

    this.readBuffer = this.gridA;
    this.writeBuffer = this.gridB;

    for (let i = 0; i < this.gridA.length; i++) {
      this.gridA[i] = Math.random() > 0.8 ? 1 : 0;
      this.gridB[i] = 0;
    }

    this.numWorkers = navigator.hardwareConcurrency || 4;
    this.chunkSize = Math.ceil(this.gridA.length / this.numWorkers);
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
        height: this.height
      });
      this.workers.push(worker);
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initBuffers(width, height);
    this.spawnWorkers();
    console.log('[ENGINE] Resized grid to', width, height);
  }

  update(callback: () => void) {
    if (this.isUpdating) return;
    this.isUpdating = true;

    this.pending = this.numWorkers;
    this._currentCallback = callback;

    for (let i = 0; i < this.numWorkers; i++) {
      const startIdx = i * this.chunkSize;
      const endIdx = Math.min(startIdx + this.chunkSize, this.gridA.length);

      const start = performance.now();

      this.workers[i].onmessage = () => {
        this.workerTimings[i] = performance.now() - start;
        this.pending--;
        if (this.pending === 0) {
          [this.readBuffer, this.writeBuffer] = [this.writeBuffer, this.readBuffer];
          this.isUpdating = false;
          this._currentCallback?.();
          this._currentCallback = null;
        }
      };

      this.workers[i].postMessage({
        startIdx,
        endIdx,
        readIsA: this.readBuffer === this.gridA
      });
    }
  }

  getWorkerTimings() {
    return this.workerTimings;
  }
}
