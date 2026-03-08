/**
 * OverlayMenu.tsx (GPU version, with FPS & PUPS)
 */

import React, { useEffect, useRef } from 'react';
import './OverlayMenu.css';
import { ObjectiveMetrics, SimulationControls } from '../webgl/simulationTypes';

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
                  <p><strong>FPS</strong><span>{fps.toFixed(1)}</span></p>
                  <p><strong>PUPS</strong><span>{pups.toLocaleString()}</span></p>
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
                <summary>Black Hole 1</summary>
                <div className="submenu-body">
                  {makeRange('Mass', controls.blackHoleMass, 0.1, 4, 0.05, 2, (next) => onControlsChange({ blackHoleMass: next }))}
                  {makeRange('Position X', controls.blackHoleX, 0, 1, 0.001, 3, (next) => onControlsChange({ blackHoleX: next }))}
                  {makeRange('Position Y', controls.blackHoleY, 0, 1, 0.001, 3, (next) => onControlsChange({ blackHoleY: next }))}
                  {makeRange('Rotation', controls.blackHoleSpin, -1, 1, 0.01, 2, (next) => onControlsChange({ blackHoleSpin: next }))}
                </div>
              </details>

              <details className="submenu" open>
                <summary>Black Hole 2</summary>
                <div className="submenu-body">
                  {makeRange('Mass', controls.blackHole2Mass, 0, 4, 0.05, 2, (next) => onControlsChange({ blackHole2Mass: next }))}
                  {makeRange('Position X', controls.blackHole2X, 0, 1, 0.001, 3, (next) => onControlsChange({ blackHole2X: next }))}
                  {makeRange('Position Y', controls.blackHole2Y, 0, 1, 0.001, 3, (next) => onControlsChange({ blackHole2Y: next }))}
                  {makeRange('Rotation', controls.blackHole2Spin, -1, 1, 0.01, 2, (next) => onControlsChange({ blackHole2Spin: next }))}
                </div>
              </details>

              <details className="submenu" open>
                <summary>White Hole Source</summary>
                <div className="submenu-body">
                  {makeRange('White Hole Mass', controls.whiteHoleMass, 0, 4, 0.05, 2, (next) => onControlsChange({ whiteHoleMass: next }))}
                  {makeRange('Source Radius', controls.whiteHoleRadius, 0.005, 0.15, 0.001, 3, (next) => onControlsChange({ whiteHoleRadius: next }))}
                  {makeRange('Source Emission', controls.whiteHoleEmission, 0, 0.4, 0.005, 3, (next) => onControlsChange({ whiteHoleEmission: next }))}
                </div>
              </details>

              <details className="submenu" open>
                <summary>Relativity Effects</summary>
                <div className="submenu-body">
                  {makeRange('Redshift Strength', controls.redshiftStrength, 0, 1.5, 0.02, 2, (next) => onControlsChange({ redshiftStrength: next }))}
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
        </div>
      </div>
    </div>
  );
};

export default OverlayMenu;
