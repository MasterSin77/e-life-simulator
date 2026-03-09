import { SimulationControls } from '../webgl/simulationTypes';

type LegacyBlackHoleFields =
  | 'blackHoleEnabled'
  | 'blackHoleMass'
  | 'blackHoleX'
  | 'blackHoleY'
  | 'blackHoleSpin'
  | 'blackHole2Enabled'
  | 'blackHole2Mass'
  | 'blackHole2X'
  | 'blackHole2Y'
  | 'blackHole2Spin'
  | 'blackHole3Enabled'
  | 'blackHole3Mass'
  | 'blackHole3X'
  | 'blackHole3Y'
  | 'blackHole3Spin';

export type PersistedControls = Omit<SimulationControls, LegacyBlackHoleFields>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const extractControlsFromPayload = (payload: unknown): Partial<SimulationControls> => {
  if (!isRecord(payload)) {
    return {};
  }

  const nested = payload.controls;
  if (isRecord(nested)) {
    return nested as Partial<SimulationControls>;
  }

  return payload as Partial<SimulationControls>;
};

export const toPersistedControls = (controls: SimulationControls): PersistedControls => {
  const {
    blackHoleEnabled: _blackHoleEnabled,
    blackHoleMass: _blackHoleMass,
    blackHoleX: _blackHoleX,
    blackHoleY: _blackHoleY,
    blackHoleSpin: _blackHoleSpin,
    blackHole2Enabled: _blackHole2Enabled,
    blackHole2Mass: _blackHole2Mass,
    blackHole2X: _blackHole2X,
    blackHole2Y: _blackHole2Y,
    blackHole2Spin: _blackHole2Spin,
    blackHole3Enabled: _blackHole3Enabled,
    blackHole3Mass: _blackHole3Mass,
    blackHole3X: _blackHole3X,
    blackHole3Y: _blackHole3Y,
    blackHole3Spin: _blackHole3Spin,
    ...rest
  } = controls;

  return {
    ...rest,
    blackHoles: controls.blackHoles.map((hole) => ({ ...hole })),
  };
};
