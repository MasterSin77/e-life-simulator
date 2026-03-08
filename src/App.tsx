import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LifeCanvas from './components/LifeCanvas';
import OverlayMenu from './components/OverlayMenu';
import {
  defaultSimulationControls,
  ObjectiveMetrics,
  sanitizeSimulationControls,
  SimulationControls,
} from './webgl/simulationTypes';
import { LifeEngineSnapshot } from './webgl/lifeEngine';

const SETTINGS_SCHEMA = 'e-life-controls-v1';
const SETTINGS_FILENAME = 'e-life-controls.json';
const REPRO_SCHEMA = 'e-life-repro-v1';

interface SerializedSnapshot {
  width: number;
  height: number;
  stateBase64: string;
  forceBase64: string;
  velocityBase64: string;
  wellsBase64: string;
}

interface ReproBundle {
  schema: string;
  exportedAt: string;
  controls: SimulationControls;
  handleOpacity: number;
  screenshotDataUrl: string;
  snapshot: SerializedSnapshot;
}

interface ReproSettingsOnly {
  schema: string;
  exportedAt: string;
  controls: SimulationControls;
  handleOpacity: number;
}

const uint8ToBase64 = (data: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < data.length; i += 1) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
};

const base64ToUint8 = (encoded: string) => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

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

  const captureReproBundle = async () => {
    const captured = await new Promise<{ snapshot: LifeEngineSnapshot; screenshotDataUrl: string }>((resolve, reject) => {
      window.dispatchEvent(new CustomEvent('captureReproBundle', {
        detail: {
          resolve,
          reject,
        },
      }));
    });

    const payload: ReproBundle = {
      schema: REPRO_SCHEMA,
      exportedAt: new Date().toISOString(),
      controls,
      handleOpacity,
      screenshotDataUrl: captured.screenshotDataUrl,
      snapshot: {
        width: captured.snapshot.width,
        height: captured.snapshot.height,
        stateBase64: uint8ToBase64(captured.snapshot.state),
        forceBase64: uint8ToBase64(captured.snapshot.force),
        velocityBase64: uint8ToBase64(captured.snapshot.velocity),
        wellsBase64: uint8ToBase64(captured.snapshot.wells),
      },
    };

    return payload;
  };

  const downloadFile = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const saveReproBundle = async () => {
    try {
      const bundle = await captureReproBundle();
      const stamp = bundle.exportedAt.replace(/[:.]/g, '-');
      const baseName = `e-life-repro-${stamp}`;
      const settingsOnly: ReproSettingsOnly = {
        schema: SETTINGS_SCHEMA,
        exportedAt: bundle.exportedAt,
        controls,
        handleOpacity,
      };

      downloadFile(
        `${baseName}.json`,
        new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      );

      downloadFile(
        `${baseName}-settings.json`,
        new Blob([JSON.stringify(settingsOnly, null, 2)], { type: 'application/json' })
      );

      const response = await fetch(bundle.screenshotDataUrl);
      const imageBlob = await response.blob();
      downloadFile(`${baseName}.png`, imageBlob);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save repro bundle.';
      window.alert(message);
    }
  };

  const loadReproBundle = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;
        const raw = await file.text();
        const parsed = JSON.parse(raw) as ReproBundle;
        if (parsed.schema !== REPRO_SCHEMA || !parsed.snapshot) {
          throw new Error('Invalid repro bundle file.');
        }

        const nextControls = sanitizeSimulationControls(parsed.controls ?? defaultSimulationControls);
        setControls(nextControls);
        if (typeof parsed.handleOpacity === 'number') {
          setHandleOpacity(Math.min(1, Math.max(0, parsed.handleOpacity)));
        }

        const snapshot: LifeEngineSnapshot = {
          width: parsed.snapshot.width,
          height: parsed.snapshot.height,
          state: base64ToUint8(parsed.snapshot.stateBase64),
          force: base64ToUint8(parsed.snapshot.forceBase64),
          velocity: base64ToUint8(parsed.snapshot.velocityBase64),
          wells: base64ToUint8(parsed.snapshot.wellsBase64),
        };

        await new Promise<void>((resolve, reject) => {
          window.dispatchEvent(new CustomEvent('loadReproBundle', {
            detail: {
              snapshot,
              resolve,
              reject,
            },
          }));
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load repro bundle.';
        window.alert(message);
      }
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
        saveReproBundle={saveReproBundle}
        loadReproBundle={loadReproBundle}
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
        saveReproBundle={saveReproBundle}
        loadReproBundle={loadReproBundle}
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
