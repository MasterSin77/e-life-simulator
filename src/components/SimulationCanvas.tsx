import React, { useRef, useEffect } from 'react';
import SimulationEngine from '../simulation/SimulationEngine';

interface Props {
  scaleRef: React.MutableRefObject<number>;
  cameraRef: React.MutableRefObject<{ x: number; y: number }>;
  minScale: number;
  setFps: (fps: number) => void;
  setPups: (pups: number) => void;
  setWorkerTimes: (times: number[]) => void;
  engineRef: React.MutableRefObject<SimulationEngine>;
}

const SimulationCanvas: React.FC<Props> = ({
  scaleRef,
  cameraRef,
  minScale,
  setFps,
  setPups,
  setWorkerTimes,
  engineRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    let viewWidth = window.innerWidth;
    let viewHeight = window.innerHeight;

    const engine = engineRef.current;
    engine.resize(viewWidth, viewHeight); // 💎 must match canvas exactly

    canvas.width = viewWidth;
    canvas.height = viewHeight;
    canvas.style.display = 'block';
    canvas.style.cursor = 'grab';

    let imageData = ctx.createImageData(viewWidth, viewHeight);
    let data = imageData.data;

    const resize = () => {
      viewWidth = window.innerWidth;
      viewHeight = window.innerHeight;

      engine.resize(viewWidth, viewHeight);

      canvas.width = viewWidth;
      canvas.height = viewHeight;
      imageData = ctx.createImageData(viewWidth, viewHeight);
      data = imageData.data;

      console.log('[RESIZE] Canvas + Grid:', viewWidth, viewHeight);
    };

    window.addEventListener('resize', resize);

    const PHYSICS_STEP_MS = 20;
    let physicsAccum = 0;
    let physicsLast = performance.now();
    let statsLast = physicsLast;

    let animationFrameId: number;
    let frameCount = 0;
    let pupsAccum = 0;

    const loop = (now: number) => {
      const dt = now - physicsLast;
      physicsLast = now;
      physicsAccum += dt;

      while (physicsAccum >= PHYSICS_STEP_MS) {
        if (!engine.isUpdating) {
          engine.update(() => { });
        }
        physicsAccum -= PHYSICS_STEP_MS;
      }

      const { x: camX, y: camY } = cameraRef.current;
      const scale = scaleRef.current;

      const startX = Math.floor(camX);
      const startY = Math.floor(camY);

      let idx = 0;
      for (let y = 0; y < viewHeight; y++) {
        for (let x = 0; x < viewWidth; x++) {
          const worldX = startX + Math.floor(x / scale);
          const worldY = startY + Math.floor(y / scale);

          let val = 0;
          if (
            worldX >= 0 && worldX < engine.width &&
            worldY >= 0 && worldY < engine.height
          ) {
            val = engine.readBuffer[worldY * engine.width + worldX] ? 255 : 0;
          }

          data[idx++] = val;
          data[idx++] = val;
          data[idx++] = val;
          data[idx++] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      pupsAccum += engine.width * engine.height;
      frameCount++;

      if (now - statsLast >= 1000) {
        setFps(frameCount);
        setPups(pupsAccum);
        setWorkerTimes([...engine.workerTimings]);
        statsLast = now;
        frameCount = 0;
        pupsAccum = 0;
      }

      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);

    // Pan & Zoom
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.2 : 0.8;
      let newScale = scaleRef.current * factor;
      if (newScale < minScale) {
        newScale = minScale;
        cameraRef.current.x = 0;
        cameraRef.current.y = 0;
      }
      scaleRef.current = newScale;
    }

    let isDragging = false;
    let lastX = 0, lastY = 0;
    function down(e: MouseEvent) {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
    }
    function move(e: MouseEvent) {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      cameraRef.current.x -= dx / scaleRef.current;
      cameraRef.current.y -= dy / scaleRef.current;

      lastX = e.clientX;
      lastY = e.clientY;
    }
    function up() {
      isDragging = false;
      canvas.style.cursor = 'grab';
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [scaleRef, cameraRef, minScale, setFps, setPups, setWorkerTimes, engineRef]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
};

export default SimulationCanvas;
