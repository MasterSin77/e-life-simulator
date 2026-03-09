import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LifeCanvas from './components/LifeCanvas';
import OverlayMenu from './components/OverlayMenu';
import {
  defaultSimulationControls,
  MAX_BLACK_HOLES,
  ObjectiveMetrics,
  sanitizeSimulationControls,
  SimulationControls,
} from './webgl/simulationTypes';
import { LifeEngineSnapshot } from './webgl/lifeEngine';
import {
  extractControlsFromPayload,
  PersistedControls,
  toPersistedControls,
} from './utils/persistence';

const SETTINGS_SCHEMA = 'e-life-controls-v1';
const SETTINGS_FILENAME = 'e-life-controls.json';
const REPRO_SCHEMA = 'e-life-repro-v1';
const AUTO_ADD_MIN_FPS = 60;
const AUTO_ADD_INTERVAL_MS = 900;
const PERSIST_WRITE_INTERVAL_MS = 750;

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
  controls: PersistedControls | Partial<SimulationControls>;
  handleOpacity: number;
  snapshot: SerializedSnapshot;
}

interface ReproSettingsOnly {
  schema: string;
  exportedAt: string;
  controls: PersistedControls;
  handleOpacity: number;
}

type HoleKind = 'black' | 'black2' | 'black3' | 'white';

interface SetHoleDynamicsDetail {
  velocities?: Partial<Record<HoleKind, { x: number; y: number }>>;
  depths?: Partial<Record<HoleKind, { d: number; vd: number }>>;
}

const withSyncedLegacyBlackHoleFields = (
  partial: Partial<SimulationControls>
): Partial<SimulationControls> => {
  if (!partial.blackHoles) {
    return partial;
  }

  const [b1, b2, b3] = partial.blackHoles;
  const synced: Partial<SimulationControls> = { ...partial };

  if (b1) {
    synced.blackHoleEnabled = b1.enabled;
    synced.blackHoleMass = b1.mass;
    synced.blackHoleX = b1.x;
    synced.blackHoleY = b1.y;
    synced.blackHoleSpin = b1.spin;
  }

  if (b2) {
    synced.blackHole2Enabled = b2.enabled;
    synced.blackHole2Mass = b2.mass;
    synced.blackHole2X = b2.x;
    synced.blackHole2Y = b2.y;
    synced.blackHole2Spin = b2.spin;
  }

  if (b3) {
    synced.blackHole3Enabled = b3.enabled;
    synced.blackHole3Mass = b3.mass;
    synced.blackHole3X = b3.x;
    synced.blackHole3Y = b3.y;
    synced.blackHole3Spin = b3.spin;
  }

  return synced;
};

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

const supportsCompressionStreams =
  typeof window !== 'undefined' &&
  'CompressionStream' in window &&
  'DecompressionStream' in window;

const compressTextGzip = async (text: string) => {
  if (!supportsCompressionStreams) {
    return new Blob([text], { type: 'application/json' });
  }
  const stream = new Blob([text], { type: 'application/json' })
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
};

const decompressGzipToText = async (blob: Blob) => {
  if (!supportsCompressionStreams) {
    throw new Error('This browser does not support .gz repro imports. Use the .json bundle instead.');
  }
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
};

const App: React.FC = () => {
  const initialControls = useMemo<SimulationControls>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_SCHEMA);
      if (!raw) return defaultSimulationControls;
      const parsed = JSON.parse(raw);
      const source = extractControlsFromPayload(parsed);
      return sanitizeSimulationControls(source as Partial<SimulationControls>);
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
  const fpsRef = useRef(0);
  const persistWriteTimerRef = useRef<number | null>(null);
  const pendingPersistPayloadRef = useRef<string | null>(null);

  const toggleHolesOpen = () => setHolesMenuOpen(!holesMenuOpen);
  const toggleConwayOpen = () => setConwayMenuOpen(!conwayMenuOpen);

  const resetZoom = () => {
    window.dispatchEvent(new CustomEvent('resetZoom'));
  };

  const resetSimulation = () => {
    window.dispatchEvent(new CustomEvent('resetSimulation'));
  };

  const applyThreeBodyPreset = useCallback(() => {
    const figureEightPositions = {
      black: { x: -0.97000436, y: 0.24308753 },
      black2: { x: 0.97000436, y: -0.24308753 },
      black3: { x: 0, y: 0 },
    };

    const figureEightVelocities = {
      black: { x: 0.466203685, y: 0.43236573 },
      black2: { x: 0.466203685, y: 0.43236573 },
      black3: { x: -0.93240737, y: -0.86473146 },
    };

    const center = 0.5;
    const positionScale = 0.16;
    const velocityScale = 0.22;

    const nextControls = sanitizeSimulationControls({
      ...defaultSimulationControls,
      paused: false,
      gravityStrength: 0.98,
      gravitySoftening: 0.35,
      eventHorizonRadius: 0.008,
      driftDamping: 1,
      blackHoleEnabled: true,
      blackHole2Enabled: true,
      blackHole3Enabled: true,
      blackHoleMass: 1.2,
      blackHole2Mass: 1.2,
      blackHole3Mass: 1.2,
      blackHoleSpin: 0,
      blackHole2Spin: 0,
      blackHole3Spin: 0,
      blackHoleX: center + figureEightPositions.black.x * positionScale,
      blackHoleY: center + figureEightPositions.black.y * positionScale,
      blackHole2X: center + figureEightPositions.black2.x * positionScale,
      blackHole2Y: center + figureEightPositions.black2.y * positionScale,
      blackHole3X: center + figureEightPositions.black3.x * positionScale,
      blackHole3Y: center + figureEightPositions.black3.y * positionScale,
      whiteHoleEnabled: false,
      whiteHoleMass: 0,
      whiteHoleEmission: 0,
      whiteHoleRadius: 0.02,
      showGravityField: true,
      wellGlowDensity: 0.55,
      wellGlowDistance: 0.45,
      spectralRenderingEnabled: true,
      spectralShiftStrength: 0.9,
      spectralSpeedReference: 0.45,
      seedDensity: 0.04,
      lifeUpdateRate: 0.62,
      advectionStrength: 3.5,
      holeBrownianStrength: 0.18,
      holeRearrangeBurst: 0.14,
      holeSeparationForce: 0.72,
      holeWeakAttraction: 0.58,
      holePreferredSpacing: 0.14,
      holeOrbitCoupling: 0.44,
      holeDepthSeparation: 0.72,
      holeEnergyFloor: 0.35,
    });

    setControls(nextControls);

    const dynamicsDetail: SetHoleDynamicsDetail = {
      velocities: {
        black: {
          x: figureEightVelocities.black.x * velocityScale,
          y: figureEightVelocities.black.y * velocityScale,
        },
        black2: {
          x: figureEightVelocities.black2.x * velocityScale,
          y: figureEightVelocities.black2.y * velocityScale,
        },
        black3: {
          x: figureEightVelocities.black3.x * velocityScale,
          y: figureEightVelocities.black3.y * velocityScale,
        },
        white: { x: 0, y: 0 },
      },
      depths: {
        black: { d: 0.5, vd: 0 },
        black2: { d: 0.5, vd: 0 },
        black3: { d: 0.5, vd: 0 },
        white: { d: 0.5, vd: 0 },
      },
    };

    window.dispatchEvent(new CustomEvent('setHoleDynamicsState', { detail: dynamicsDetail }));
    resetZoom();
    resetSimulation();
  }, []);

  const updateControls = useCallback((partial: Partial<SimulationControls>) => {
    const nextPartial = withSyncedLegacyBlackHoleFields(partial);
    setControls((prev) => sanitizeSimulationControls({ ...prev, ...nextPartial }));
  }, []);

  useEffect(() => {
    fpsRef.current = fps;
  }, [fps]);

  useEffect(() => {
    pendingPersistPayloadRef.current = JSON.stringify({
      schema: SETTINGS_SCHEMA,
      controls: toPersistedControls(controls),
    });

    if (persistWriteTimerRef.current !== null) {
      return;
    }

    // localStorage writes are synchronous; batch them to avoid frame hitches.
    persistWriteTimerRef.current = window.setTimeout(() => {
      const payload = pendingPersistPayloadRef.current;
      if (payload) {
        localStorage.setItem(SETTINGS_SCHEMA, payload);
      }
      pendingPersistPayloadRef.current = null;
      persistWriteTimerRef.current = null;
    }, PERSIST_WRITE_INTERVAL_MS);
  }, [controls]);

  useEffect(() => {
    return () => {
      if (persistWriteTimerRef.current !== null) {
        window.clearTimeout(persistWriteTimerRef.current);
      }
      const payload = pendingPersistPayloadRef.current;
      if (payload) {
        localStorage.setItem(SETTINGS_SCHEMA, payload);
      }
      pendingPersistPayloadRef.current = null;
      persistWriteTimerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!controls.autoMaxBlackHoles) {
      return;
    }

    const autoAddTick = () => {
      setControls((prev) => {
        if (!prev.autoMaxBlackHoles || prev.blackHoles.length >= MAX_BLACK_HOLES) {
          return prev;
        }
        if (fpsRef.current < AUTO_ADD_MIN_FPS) {
          return prev;
        }

        const index = prev.blackHoles.length;
        const fallback = prev.blackHoles[Math.max(0, index - 1)] ?? {
          enabled: true,
          mass: 1,
          x: 0.5,
          y: 0.5,
          spin: 0,
        };
        const offset = 0.07 * (index + 1);
        const nextHole = {
          enabled: true,
          mass: fallback.mass,
          x: (fallback.x + offset) % 1,
          y: (fallback.y + offset * 0.5) % 1,
          spin: fallback.spin,
        };

        return sanitizeSimulationControls({
          ...prev,
          blackHoles: [...prev.blackHoles, nextHole],
        });
      });
    };

    // Run an immediate probe so users see quick feedback after enabling.
    autoAddTick();
    const intervalId = window.setInterval(autoAddTick, AUTO_ADD_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [controls.autoMaxBlackHoles]);

  const applyImportedControls = (incoming: Partial<SimulationControls>) => {
    const next = sanitizeSimulationControls(incoming);
    setControls(next);
    resetZoom();
    resetSimulation();
  };

  const exportPayload = () => JSON.stringify({
    schema: SETTINGS_SCHEMA,
    exportedAt: new Date().toISOString(),
    controls: toPersistedControls(controls),
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
    const parsed = JSON.parse(payload);
    const source = extractControlsFromPayload(parsed);
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
      controls: toPersistedControls(controls),
      handleOpacity,
      snapshot: {
        width: captured.snapshot.width,
        height: captured.snapshot.height,
        stateBase64: uint8ToBase64(captured.snapshot.state),
        forceBase64: uint8ToBase64(captured.snapshot.force),
        velocityBase64: uint8ToBase64(captured.snapshot.velocity),
        wellsBase64: uint8ToBase64(captured.snapshot.wells),
      },
    };

    return {
      bundle: payload,
      screenshotDataUrl: captured.screenshotDataUrl,
    };
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
      const { bundle, screenshotDataUrl } = await captureReproBundle();
      const stamp = bundle.exportedAt.replace(/[:.]/g, '-');
      const baseName = `e-life-repro-${stamp}`;
      const settingsOnly: ReproSettingsOnly = {
        schema: SETTINGS_SCHEMA,
        exportedAt: bundle.exportedAt,
        controls: toPersistedControls(controls),
        handleOpacity,
      };

      downloadFile(
        `${baseName}.json.gz`,
        await compressTextGzip(JSON.stringify(bundle))
      );

      downloadFile(
        `${baseName}-settings.json`,
        new Blob([JSON.stringify(settingsOnly, null, 2)], { type: 'application/json' })
      );

      const response = await fetch(screenshotDataUrl);
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
    input.accept = 'application/json,.json,.gz';
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;
        const lower = file.name.toLowerCase();
        const raw = lower.endsWith('.gz')
          ? await decompressGzipToText(file)
          : await file.text();
        const parsed = JSON.parse(raw) as ReproBundle;
        if (parsed.schema !== REPRO_SCHEMA || !parsed.snapshot) {
          throw new Error('Invalid repro bundle file.');
        }

        const nextControls = sanitizeSimulationControls(extractControlsFromPayload(parsed));
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
        applyThreeBodyPreset={applyThreeBodyPreset}
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
        applyThreeBodyPreset={applyThreeBodyPreset}
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
