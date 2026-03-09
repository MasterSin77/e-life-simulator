/**
 * OverlayMenu.tsx (GPU version, with FPS & PUPS)
 */

import React, { useEffect, useRef } from 'react';
import './OverlayMenu.css';
import { MAX_BLACK_HOLES, ObjectiveMetrics, SimulationControls } from '../webgl/simulationTypes';

interface OverlayMenuProps {
  isOpen: boolean;
  toggleOpen: () => void;
  side: 'left' | 'right';
  mode: 'holes' | 'conway';
  panelTitle: string;
  panelSubtitle: string;
  resetZoom: () => void;
  resetSimulation: () => void;
  copySettings: () => void;
  downloadSettings: () => void;
  importSettingsFromClipboard: () => void;
  importSettingsFromFile: () => void;
  saveReproBundle: () => void;
  loadReproBundle: () => void;
  applyThreeBodyPreset: () => void;
  setIsOpen: (value: boolean) => void;
  fps: number;
  pups: number;
  controls: SimulationControls;
  objectiveMetrics: ObjectiveMetrics;
  onControlsChange: (partial: Partial<SimulationControls>) => void;
  handleOpacity: number;
  onHandleOpacityChange: (opacity: number) => void;
}


const OverlayMenu: React.FC<OverlayMenuProps> = ({
  isOpen,
  toggleOpen,
  side,
  mode,
  panelTitle,
  panelSubtitle,
  resetZoom,
  resetSimulation,
  copySettings,
  downloadSettings,
  importSettingsFromClipboard,
  importSettingsFromFile,
  saveReproBundle,
  loadReproBundle,
  applyThreeBodyPreset,
  setIsOpen,
  fps,
  pups,
  controls,
  objectiveMetrics,
  onControlsChange,
  handleOpacity,
  onHandleOpacityChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const safeFpsLabel = Number.isFinite(fps) ? fps.toFixed(1) : '0.0';
  const safePupsLabel = Number.isFinite(pups) ? pups.toLocaleString() : '0';

  const updateBlackHole = (
    index: number,
    patch: Partial<SimulationControls['blackHoles'][number]>
  ) => {
    if (patch.enabled === false && controls.blackHoles.length <= 1) {
      return;
    }

    if (patch.enabled === false && controls.blackHoles.length > 1) {
      onControlsChange({
        blackHoles: controls.blackHoles.filter((_, holeIndex) => holeIndex !== index),
      });
      return;
    }

    const nextBlackHoles = controls.blackHoles.map((hole, holeIndex) =>
      holeIndex === index ? { ...hole, ...patch } : hole
    );
    onControlsChange({ blackHoles: nextBlackHoles });
  };

  const addBlackHole = () => {
    if (controls.blackHoles.length >= MAX_BLACK_HOLES) {
      return;
    }

    const index = controls.blackHoles.length;
    const fallback = controls.blackHoles[Math.max(0, index - 1)] ?? {
      enabled: true,
      mass: 1,
      x: 0.5,
      y: 0.5,
      spin: 0,
    };
    const offset = 0.07 * (index + 1);
    const next = {
      enabled: true,
      mass: fallback.mass,
      x: (fallback.x + offset) % 1,
      y: (fallback.y + offset * 0.5) % 1,
      spin: fallback.spin,
    };

    onControlsChange({ blackHoles: [...controls.blackHoles, next] });
  };

  const removeBlackHole = (index: number) => {
    if (controls.blackHoles.length <= 1) {
      return;
    }
    onControlsChange({
      blackHoles: controls.blackHoles.filter((_, holeIndex) => holeIndex !== index),
    });
  };

  const makeRange = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    precision: number,
    onChange: (next: number) => void,
    description?: string
  ) => (
    <label className="control-row">
      <span>{label}</span>
      {description && <small className="control-help">{description}</small>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <strong>{value.toFixed(precision)}</strong>
    </label>
  );

  const makeToggle = (
    label: string,
    checked: boolean,
    onChange: (next: boolean) => void,
    description?: string
  ) => (
    <label className="control-row">
      <span>{label}</span>
      {description && <small className="control-help">{description}</small>}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  return (
    <div
      ref={containerRef}
      className={`overlay-container ${side} ${isOpen ? 'open' : ''}`}
    >
      <div className="hamburger" onClick={toggleOpen}>
        ☰
      </div>

      <div className="panel">
        <div className="panel-header">
          <h4>{panelTitle}</h4>
          <p>{panelSubtitle}</p>
        </div>

        <div className="panel-content">
          {mode === 'conway' && (
            <>
              <details className="submenu" open>
                <summary>Performance Monitor</summary>
                <div className="submenu-body metrics-grid">
                  <p><strong>FPS</strong><span>{safeFpsLabel}</span></p>
                  <p><strong>PUPS</strong><span>{safePupsLabel}</span></p>
                  <p><strong>Alive</strong><span>{(objectiveMetrics.aliveRatio * 100).toFixed(1)}%</span></p>
                  <p><strong>Harmony</strong><span>{objectiveMetrics.neighborHarmony.toFixed(3)}</span></p>
                  <p><strong>Velocity</strong><span>{objectiveMetrics.avgVelocity.toFixed(3)}</span></p>
                  <p><strong>Objective</strong><span>{objectiveMetrics.objectiveScore.toFixed(3)}</span></p>
                </div>
              </details>

              <details className="submenu" open>
                <summary>Simulation Core</summary>
                <div className="submenu-body">
                  {makeToggle(
                    'Pause',
                    controls.paused,
                    (next) => onControlsChange({ paused: next }),
                    'Freeze all simulation updates while keeping the current state visible.'
                  )}
                  {makeToggle(
                    'Conway Life',
                    controls.lifeEnabled,
                    (next) => onControlsChange({ lifeEnabled: next }),
                    'Turns Conway birth/survival updates on or off while keeping gravity/advection running.'
                  )}
                  {makeRange(
                    'Seed Density',
                    controls.seedDensity,
                    0.01,
                    0.35,
                    0.005,
                    3,
                    (next) => onControlsChange({ seedDensity: next }),
                    'Controls initial population density when reseeding the world.'
                  )}
                  {makeRange(
                    'Life Update Rate',
                    controls.lifeUpdateRate,
                    0.15,
                    1,
                    0.01,
                    2,
                    (next) => onControlsChange({ lifeUpdateRate: next }),
                    'Sets how quickly Conway state transitions are applied each frame.'
                  )}
                  {makeRange(
                    'Dense Mass Cutoff',
                    controls.denseMassCutoff,
                    0.5,
                    1,
                    0.01,
                    2,
                    (next) => onControlsChange({ denseMassCutoff: next }),
                    'Threshold used to classify dense regions that influence life-rule weighting.'
                  )}
                  {makeRange(
                    'Decay Blend',
                    controls.lifeDecayRate,
                    0,
                    1,
                    0.01,
                    2,
                    (next) => onControlsChange({ lifeDecayRate: next }),
                    'Blends from previous to next life state each update; lower values keep memory longer.'
                  )}
                  {makeRange(
                    'Birth Min',
                    controls.lifeBirthMin,
                    0,
                    8,
                    1,
                    0,
                    (next) => onControlsChange({ lifeBirthMin: next }),
                    'Minimum live neighbors required for a dead cell to become alive.'
                  )}
                  {makeRange(
                    'Birth Max',
                    controls.lifeBirthMax,
                    0,
                    8,
                    1,
                    0,
                    (next) => onControlsChange({ lifeBirthMax: next }),
                    'Maximum live neighbors allowed for a birth event.'
                  )}
                  {makeRange(
                    'Survive Min',
                    controls.lifeSurvivalMin,
                    0,
                    8,
                    1,
                    0,
                    (next) => onControlsChange({ lifeSurvivalMin: next }),
                    'Minimum live neighbors required for an alive cell to survive.'
                  )}
                  {makeRange(
                    'Survive Max',
                    controls.lifeSurvivalMax,
                    0,
                    8,
                    1,
                    0,
                    (next) => onControlsChange({ lifeSurvivalMax: next }),
                    'Maximum live neighbors allowed for survival.'
                  )}
                  {makeRange(
                    'Transport Retention',
                    controls.lifeTransportRetention,
                    0,
                    1,
                    0.01,
                    2,
                    (next) => onControlsChange({ lifeTransportRetention: next }),
                    'How much advected life-state signal is preserved during the update.'
                  )}
                  {makeRange(
                    'Advection',
                    controls.advectionStrength,
                    0,
                    12,
                    0.25,
                    2,
                    (next) => onControlsChange({ advectionStrength: next }),
                    'Strength of material transport through the velocity field.'
                  )}
                  {makeRange(
                    'Damping',
                    controls.driftDamping,
                    0.8,
                    1,
                    0.002,
                    3,
                    (next) => onControlsChange({ driftDamping: next }),
                    'How quickly motion decays over time; lower values damp movement faster.'
                  )}
                </div>
              </details>

              <details className="submenu" open>
                <summary>Conway Notes</summary>
                <div className="submenu-body">
                  <p className="menu-note">Seed Density + Re-Seed World defines your starting pattern complexity.</p>
                  <p className="menu-note">Birth/Survival min-max windows let you morph B/S rules beyond classic Conway (B3/S23).</p>
                  <p className="menu-note">Decay Blend and Transport Retention tune persistence vs volatility in the life field.</p>
                  <p className="menu-note">Life Update Rate, Dense Mass Cutoff, Advection, and Damping shape evolution speed and stability.</p>
                  <p className="menu-note">Use Pause to inspect a frame, then unpause to continue the same timeline.</p>
                </div>
              </details>
            </>
          )}

          {mode === 'holes' && (
            <>
              <details className="submenu" open>
                <summary>Interaction Handles</summary>
                <div className="submenu-body">
                  {makeRange('Handle Opacity', handleOpacity, 0, 1, 0.01, 2, onHandleOpacityChange)}
                </div>
              </details>

              <details className="submenu" open>
                <summary>Gravity Field</summary>
                <div className="submenu-body">
                  {makeRange('Gravity', controls.gravityStrength, 0, 1, 0.01, 2, (next) => onControlsChange({ gravityStrength: next }))}
                  {makeRange('Gravity Softening', controls.gravitySoftening, 0.2, 4, 0.05, 2, (next) => onControlsChange({ gravitySoftening: next }))}
                  {makeRange('Event Horizon', controls.eventHorizonRadius, 0.005, 0.1, 0.001, 3, (next) => onControlsChange({ eventHorizonRadius: next }))}
                  <label className="control-row">
                    <span>Show Gravity Field</span>
                    <input
                      type="checkbox"
                      checked={controls.showGravityField}
                      onChange={(e) => onControlsChange({ showGravityField: e.target.checked })}
                    />
                  </label>
                </div>
              </details>

              <details className="submenu" open>
                <summary>Black Holes ({controls.blackHoles.length})</summary>
                <div className="submenu-body">
                  {makeRange(
                    'Brownian Motion',
                    controls.holeBrownianStrength,
                    0,
                    1,
                    0.01,
                    2,
                    (next) => onControlsChange({ holeBrownianStrength: next }),
                    'Continuous jitter that keeps holes mobile even when local forces balance.'
                  )}
                  {makeRange(
                    'Rearrange Bursts',
                    controls.holeRearrangeBurst,
                    0,
                    2,
                    0.01,
                    2,
                    (next) => onControlsChange({ holeRearrangeBurst: next }),
                    'Probability and intensity of sudden slippage/reconfiguration kicks.'
                  )}
                  {makeRange(
                    'Strong Separation',
                    controls.holeSeparationForce,
                    0,
                    2,
                    0.01,
                    2,
                    (next) => onControlsChange({ holeSeparationForce: next }),
                    'Short-range repulsion that prevents nuclei from collapsing into one point.'
                  )}
                  {makeRange(
                    'Weak Binding',
                    controls.holeWeakAttraction,
                    0,
                    2,
                    0.01,
                    2,
                    (next) => onControlsChange({ holeWeakAttraction: next }),
                    'Mid-range attraction that keeps systems coherent without direct merging.'
                  )}
                  {makeRange(
                    'Preferred Spacing',
                    controls.holePreferredSpacing,
                    0.02,
                    0.45,
                    0.005,
                    3,
                    (next) => onControlsChange({ holePreferredSpacing: next }),
                    'Approximate standoff distance around which strong/weak forces balance.'
                  )}
                  {makeRange(
                    'Orbital Coupling',
                    controls.holeOrbitCoupling,
                    0,
                    2,
                    0.01,
                    2,
                    (next) => onControlsChange({ holeOrbitCoupling: next }),
                    'Tangential steering that encourages circling instead of head-on collision.'
                  )}
                  {makeRange(
                    'Depth Separation',
                    controls.holeDepthSeparation,
                    0,
                    2,
                    0.01,
                    2,
                    (next) => onControlsChange({ holeDepthSeparation: next }),
                    'Pushes holes apart along the hidden depth axis to avoid occupying one space.'
                  )}
                  {makeRange(
                    'Energy Floor',
                    controls.holeEnergyFloor,
                    0,
                    1,
                    0.01,
                    2,
                    (next) => onControlsChange({ holeEnergyFloor: next }),
                    'Maintains minimum kinetic energy so hole systems stay lively and dynamic.'
                  )}
                  {makeRange(
                    'Crowding Momentum',
                    controls.holeCrowdingMomentum,
                    0,
                    2,
                    0.01,
                    2,
                    (next) => onControlsChange({ holeCrowdingMomentum: next }),
                    'Adds incremental momentum when nearby black-hole mass concentration exceeds a threshold derived from existing spacing/binding forces.'
                  )}
                  {makeToggle(
                    'Auto Max By FPS (>=60)',
                    controls.autoMaxBlackHoles,
                    (next) => onControlsChange({ autoMaxBlackHoles: next }),
                    'Automatically adds black holes while FPS stays at or above 60.'
                  )}
                  <button
                    onClick={addBlackHole}
                    className="panel-btn panel-btn-secondary"
                    disabled={controls.blackHoles.length >= MAX_BLACK_HOLES}
                  >
                    Add Black Hole
                  </button>
                </div>
              </details>

              {controls.blackHoles.map((hole, index) => (
                <details className="submenu" key={`black-hole-${index}`}>
                  <summary>Black Hole {index + 1}</summary>
                  <div className="submenu-body">
                    {makeToggle(
                      'Enabled',
                      hole.enabled,
                      (next) => updateBlackHole(index, { enabled: next }),
                      index === 0
                        ? controls.blackHoles.length > 1
                          ? 'Disabling this removes it from the list while at least one black hole remains.'
                          : 'At least one black hole is always kept in the list.'
                        : 'Disabling this removes it from the list.'
                    )}
                    {makeRange('Mass', hole.mass, 0, 4, 0.05, 2, (next) => updateBlackHole(index, { mass: next }))}
                    {makeRange('Position X', hole.x, 0, 1, 0.001, 3, (next) => updateBlackHole(index, { x: next }))}
                    {makeRange('Position Y', hole.y, 0, 1, 0.001, 3, (next) => updateBlackHole(index, { y: next }))}
                    {makeRange('Rotation', hole.spin, -1, 1, 0.01, 2, (next) => updateBlackHole(index, { spin: next }))}
                    {index >= 1 && (
                      <button
                        onClick={() => removeBlackHole(index)}
                        className="panel-btn panel-btn-secondary"
                      >
                        Remove Black Hole
                      </button>
                    )}
                  </div>
                </details>
              ))}

              <details className="submenu" open>
                <summary>White Hole Source</summary>
                <div className="submenu-body">
                  {makeToggle(
                    'Enabled',
                    controls.whiteHoleEnabled,
                    (next) => onControlsChange({ whiteHoleEnabled: next }),
                    'Turn the white-hole emitter and its reactive effects on or off.'
                  )}
                  {makeRange('White Hole Mass', controls.whiteHoleMass, 0, 4, 0.05, 2, (next) => onControlsChange({ whiteHoleMass: next }))}
                  {makeRange('Source Radius', controls.whiteHoleRadius, 0.005, 0.15, 0.001, 3, (next) => onControlsChange({ whiteHoleRadius: next }))}
                  {makeRange('Source Emission', controls.whiteHoleEmission, 0, 0.4, 0.005, 3, (next) => onControlsChange({ whiteHoleEmission: next }))}
                </div>
              </details>

              <details className="submenu" open>
                <summary>Relativity Effects</summary>
                <div className="submenu-body">
                  {makeRange(
                    'Gravity Redshift',
                    controls.redshiftStrength,
                    0,
                    1.5,
                    0.02,
                    2,
                    (next) => onControlsChange({ redshiftStrength: next }),
                    'Adds gravitational redshift near event horizons independent of line-of-sight velocity.'
                  )}
                </div>
              </details>

              <details className="submenu" open>
                <summary>Spectral Doppler</summary>
                <div className="submenu-body">
                  {makeToggle(
                    'Enable Spectrum',
                    controls.spectralRenderingEnabled,
                    (next) => onControlsChange({ spectralRenderingEnabled: next }),
                    'Toggles full-rainbow Doppler coloring for particulate speed.'
                  )}
                  {makeRange(
                    'Shift Strength',
                    controls.spectralShiftStrength,
                    0,
                    3,
                    0.02,
                    2,
                    (next) => onControlsChange({ spectralShiftStrength: next }),
                    'Scales how strongly toward/away velocity bends particle color through the spectrum.'
                  )}
                  {makeRange(
                    'Speed Reference',
                    controls.spectralSpeedReference,
                    0.05,
                    1,
                    0.01,
                    2,
                    (next) => onControlsChange({ spectralSpeedReference: next }),
                    'Velocity that maps to the strongest color shift; lower values make shifts more sensitive.'
                  )}
                  {makeRange(
                    'Viewer Angle',
                    controls.spectralViewAngle,
                    0,
                    360,
                    1,
                    0,
                    (next) => onControlsChange({ spectralViewAngle: next }),
                    'Sets the line-of-sight direction used to classify motion as moving toward or away.'
                  )}
                  {makeRange(
                    'Hue Offset',
                    controls.spectralHueOffset,
                    0,
                    1,
                    0.01,
                    2,
                    (next) => onControlsChange({ spectralHueOffset: next }),
                    'Slides the entire spectrum wheel without changing physical shift intensity.'
                  )}
                  {makeRange(
                    'Hue Span',
                    controls.spectralHueSpan,
                    0.05,
                    1,
                    0.01,
                    2,
                    (next) => onControlsChange({ spectralHueSpan: next }),
                    'Controls how much of the rainbow is used; set to 1.00 for full-spectrum mapping.'
                  )}
                  {makeRange(
                    'Saturation',
                    controls.spectralSaturation,
                    0,
                    1,
                    0.01,
                    2,
                    (next) => onControlsChange({ spectralSaturation: next }),
                    'Adjusts color purity of the spectral rendering for readability versus intensity.'
                  )}
                </div>
              </details>

              <details className="submenu" open>
                <summary>Black Hole Visualization</summary>
                <div className="submenu-body">
                  {makeRange('Glow Density', controls.wellGlowDensity, 0, 1, 0.01, 2, (next) => onControlsChange({ wellGlowDensity: next }))}
                  {makeRange('Fade Distance', controls.wellGlowDistance, 0, 1, 0.01, 2, (next) => onControlsChange({ wellGlowDistance: next }))}
                </div>
              </details>
            </>
          )}
        </div>

        <div className="panel-actions">
          <button onClick={resetZoom} className="panel-btn panel-btn-secondary">
            Reset Zoom
          </button>
          <button onClick={resetSimulation} className="panel-btn panel-btn-primary">
            Re-Seed World
          </button>
          <button onClick={copySettings} className="panel-btn panel-btn-secondary">
            Copy Settings
          </button>
          <button onClick={downloadSettings} className="panel-btn panel-btn-secondary">
            Download Settings
          </button>
          <button onClick={importSettingsFromClipboard} className="panel-btn panel-btn-primary">
            Import Clipboard
          </button>
          <button onClick={importSettingsFromFile} className="panel-btn panel-btn-primary">
            Import File
          </button>
          <button onClick={saveReproBundle} className="panel-btn panel-btn-secondary">
            Save Repro Bundle
          </button>
          <button onClick={loadReproBundle} className="panel-btn panel-btn-primary">
            Load Repro Bundle
          </button>
          {mode === 'holes' && (
            <button onClick={applyThreeBodyPreset} className="panel-btn panel-btn-primary">
              Load 3-Body Preset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverlayMenu;
