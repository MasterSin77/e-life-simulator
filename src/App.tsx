import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LifeCanvas from './components/LifeCanvas';
import OverlayMenu from './components/OverlayMenu';
import {
  defaultSimulationControls,
  ObjectiveMetrics,
  sanitizeSimulationControls,
  SimulationControls,
} from './webgl/simulationTypes';

const SETTINGS_SCHEMA = 'e-life-controls-v1';
const SETTINGS_FILENAME = 'e-life-controls.json';

const App: React.FC = () => {
  const initialControls = useMemo<SimulationControls>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_SCHEMA);
      if (!raw) return defaultSimulationControls;
      const parsed = JSON.parse(raw) as { schema?: string; controls?: Partial<SimulationControls> };
      const source = parsed?.controls ?? parsed;
      return sanitizeSimulationControls({ ...defaultSimulationControls, ...(source as Partial<SimulationControls>) });
    } catch {
      return defaultSimulationControls;
    }
  }, []);

  const [fps, setFps] = useState(0);
  const [pups, setPups] = useState(0);
  const [holesMenuOpen, setHolesMenuOpen] = useState(false);
  const [conwayMenuOpen, setConwayMenuOpen] = useState(false);
  const [controls, setControls] = useState<SimulationControls>(initialControls);
  const [handleOpacity, setHandleOpacity] = useState(0.9);
  const [metrics, setMetrics] = useState<ObjectiveMetrics>({
    aliveRatio: 0,
    neighborHarmony: 0,
    avgVelocity: 0,
    objectiveScore: 0,
  });

  const toggleHolesOpen = () => setHolesMenuOpen(!holesMenuOpen);
  const toggleConwayOpen = () => setConwayMenuOpen(!conwayMenuOpen);

  const resetZoom = () => {
    window.dispatchEvent(new CustomEvent('resetZoom'));
  };

  const resetSimulation = () => {
    window.dispatchEvent(new CustomEvent('resetSimulation'));
  };

  const updateControls = useCallback((partial: Partial<SimulationControls>) => {
    setControls((prev) => sanitizeSimulationControls({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_SCHEMA, JSON.stringify({
      schema: SETTINGS_SCHEMA,
      controls,
    }));
  }, [controls]);

  const applyImportedControls = (incoming: Partial<SimulationControls>) => {
    const next = sanitizeSimulationControls({ ...defaultSimulationControls, ...incoming });
    setControls(next);
    resetZoom();
    resetSimulation();
  };

  const exportPayload = () => JSON.stringify({
    schema: SETTINGS_SCHEMA,
    exportedAt: new Date().toISOString(),
    controls,
  }, null, 2);

  const copySettings = async () => {
    const payload = exportPayload();
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = SETTINGS_FILENAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  };

  const downloadSettings = () => {
    const payload = exportPayload();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = SETTINGS_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importFromPayload = (payload: string) => {
    const parsed = JSON.parse(payload) as { controls?: Partial<SimulationControls> } | Partial<SimulationControls>;
    const source = (parsed as { controls?: Partial<SimulationControls> }).controls ?? (parsed as Partial<SimulationControls>);
    applyImportedControls(source);
  };

  const importSettingsFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      importFromPayload(text);
    } catch {
      const pasted = window.prompt('Paste settings JSON:');
      if (!pasted) return;
      importFromPayload(pasted);
    }
  };

  const importSettingsFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      importFromPayload(text);
    };
    input.click();
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0, padding: 0, overflow: 'hidden',
      position: 'relative'
    }}>
      <LifeCanvas
        setFps={setFps}
        setPups={setPups}
        setObjectiveMetrics={setMetrics}
        controls={controls}
        onControlsChange={updateControls}
        handleOpacity={handleOpacity}
      />
      <OverlayMenu
        isOpen={holesMenuOpen}
        toggleOpen={toggleHolesOpen}
        side="left"
        mode="holes"
        panelTitle="Hole Controls"
        panelSubtitle="Black holes, white hole, and field controls"
        resetZoom={resetZoom}
        resetSimulation={resetSimulation}
        copySettings={copySettings}
        downloadSettings={downloadSettings}
        importSettingsFromClipboard={importSettingsFromClipboard}
        importSettingsFromFile={importSettingsFromFile}
        setIsOpen={setHolesMenuOpen}
        fps={fps}
        pups={pups}
        controls={controls}
        objectiveMetrics={metrics}
        onControlsChange={updateControls}
        handleOpacity={handleOpacity}
        onHandleOpacityChange={setHandleOpacity}
      />
      <OverlayMenu
        isOpen={conwayMenuOpen}
        toggleOpen={toggleConwayOpen}
        side="right"
        mode="conway"
        panelTitle="Conway Logic"
        panelSubtitle="Core life simulation behavior"
        resetZoom={resetZoom}
        resetSimulation={resetSimulation}
        copySettings={copySettings}
        downloadSettings={downloadSettings}
        importSettingsFromClipboard={importSettingsFromClipboard}
        importSettingsFromFile={importSettingsFromFile}
        setIsOpen={setConwayMenuOpen}
        fps={fps}
        pups={pups}
        controls={controls}
        objectiveMetrics={metrics}
        onControlsChange={updateControls}
        handleOpacity={handleOpacity}
        onHandleOpacityChange={setHandleOpacity}
      />
    </div>
  );
};

export default App;
