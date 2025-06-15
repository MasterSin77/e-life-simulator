/**
 * App.tsx
 * ✅ Single robust canvas
 * ✅ CPU Workers + GPU render
 * ✅ Live FPS, PUPS, Worker timings in slide-out OverlayMenu
 */

import React, { useRef, useState } from 'react';
import SimulationEngine from './simulation/SimulationEngine';
import SimulationCanvas from './components/SimulationCanvas';
import OverlayMenu from './components/OverlayMenu';

const App: React.FC = () => {
  const scaleRef = useRef(1);
  const cameraRef = useRef({ x: 0, y: 0 });
  const minScale = 1;
  const engineRef = useRef(new SimulationEngine(1000, 1000));

  const [fps, setFps] = useState(0);
  const [pups, setPups] = useState(0);
  const [workerTimes, setWorkerTimes] = useState<number[]>([]);

  const [menuOpen, setMenuOpen] = useState(false);

  const toggleOpen = () => setMenuOpen(!menuOpen);
  const resetZoom = () => {
    scaleRef.current = minScale;
    cameraRef.current.x = 0;
    cameraRef.current.y = 0;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', position: 'relative' }}>
      <SimulationCanvas
        scaleRef={scaleRef}
        cameraRef={cameraRef}
        minScale={minScale}
        setFps={setFps}
        setPups={setPups}
        setWorkerTimes={setWorkerTimes}
        engineRef={engineRef}
      />

      <OverlayMenu
        isOpen={menuOpen}
        toggleOpen={toggleOpen}
        resetZoom={resetZoom}
        setIsOpen={setMenuOpen}
        fps={fps}
        pups={pups}
        workerTimes={workerTimes}
      />
    </div>
  );
};

export default App;
