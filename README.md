# e-Life: GPU Evolution Simulator ![version](https://img.shields.io/badge/version-3.1.0-blue)

**Version 3.1.0 — WebGL Conway + gravity-well simulation with configurable life-rule controls**

e-Life is an experimental real-time sandbox for emergent structures driven by Conway-like cellular rules, advection, and stylized black/white-hole gravity fields. The simulation runs in a GPU shader pipeline and is controlled via React overlay menus.

## What the simulation implements

- **GPU pipeline** (WebGL2 fragment passes): density, blur, wells, gravity force, velocity integration, advection, life update, display.
- **Gravity-well model** with two black holes + one white hole, plus event horizon absorption and optional gravity-field display.
- **Conway-derived life model** that supports classic behavior and extended rules via menu controls.
- **Objective metrics** sampled from GPU buffers (alive ratio, neighbor harmony, average velocity, objective score).

## Recent changes in v3.1.0

- Added fully configurable Conway rule windows:
  - `Birth Min`, `Birth Max`
  - `Survive Min`, `Survive Max`
- Added life persistence controls:
  - `Decay Blend` (mix prior state into next state)
  - `Transport Retention` (how much advected signal persists)
- Wired new controls end-to-end:
  - Typed control model + sanitizer bounds/normalization
  - WebGL uniform uploads in the engine
  - Shader logic updates in `computeLife.frag`
  - Conway menu sliders in the UI
- Added/updated tests for control sanitization and Conway parameter normalization.

## Important simulation notes

- This is a **stylized physics model**, not a full relativistic solver.
- Orbital/escape behaviors are influenced by:
  - velocity cap and damping
  - event horizon absorption
  - Conway decay and transport blending
- Use the Conway menu to tune volatility vs persistence before drawing conclusions about “escape” behavior.

## Run the project

### Development

```bash
npm start
```

Runs the React dev server with hot reload.

### Production build

```bash
npm run build
```

Creates an optimized build in `/build`.

### Serve build locally

```bash
npm run serve
```

Serves the production build via `server.js`.

### Run tests (single run)

```bash
npm test -- --watch=false
```

## Key files

- GPU engine: `/src/webgl/lifeEngine.ts`
- Simulation controls/types: `/src/webgl/simulationTypes.ts`
- Conway/holes menu UI: `/src/components/OverlayMenu.tsx`
- Main app composition: `/src/App.tsx`
- Life shader: `/public/shaders/computeLife.frag`
- Gravity/velocity shaders: `/public/shaders/computeGravity.frag`, `/public/shaders/computeVelocity.frag`
- Objective metrics: `/src/simulation/objectiveMetrics.ts`

## Versioning

- Current version: **3.1.0**
- Baseline progression: CPU prototype (v1/v2) → GPU pipeline (v3+) with interactive control expansion.
