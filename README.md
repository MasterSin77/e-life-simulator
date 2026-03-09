# e-Life: GPU Evolution Simulator ![version](https://img.shields.io/badge/version-3.2.0-blue)

**Version 3.2.0 — N-black-hole controls, dynamic hole dynamics, and spectral rendering upgrades**

e-Life is an experimental real-time sandbox for emergent structures driven by Conway-like cellular rules, advection, and stylized black/white-hole gravity fields. The simulation runs in a GPU shader pipeline and is controlled via React overlay menus.

## What the simulation implements

- **GPU pipeline** (WebGL2 fragment passes): density, blur, wells, gravity force, velocity integration, advection, life update, display.
- **Gravity-well model** with two black holes + one white hole, plus event horizon absorption and optional gravity-field display.
- **Conway-derived life model** that supports classic behavior and extended rules via menu controls.
- **Objective metrics** sampled from GPU buffers (alive ratio, neighbor harmony, average velocity, objective score).

## Recent changes in v3.2.0

This release builds on the v3.1.x line (Conway control expansion + reproducible `.json.gz` bundles) by completing the N-black-hole migration and runtime polish.

- Completed the N-black-hole model across app state, controls, and rendering:
  - Canonical `blackHoles[]` controls with capped runtime size (`MAX_BLACK_HOLES = 16`)
  - Backward-compatible ingestion of legacy `blackHole*` scalar fields
  - Array-based GPU uniform transport in gravity/well/life shaders
- Added dynamic black-hole control UX:
  - Add/remove black holes in the holes panel
  - Per-hole enable/mass/position/spin controls
  - Optional auto-add while FPS stays at or above 60
- Added 3-body preset orchestration:
  - Figure-eight-inspired initialization
  - Velocity/depth seeding via `setHoleDynamicsState`
- Added expanded hole dynamics and anti-nucleus behavior in canvas runtime:
  - Brownian/rearrange/separation/binding/orbit/depth/crowding controls
  - White-hole reaction force and spin transfer during close interactions
- Added spectral Doppler control surface and uniforms for display tuning:
  - Spectrum toggle, shift strength, speed reference, viewer angle, hue offset/span, saturation
- Added performance guardrails and diagnostics:
  - Metrics sampling is opt-in (`?metrics=on`)
  - Perf probe logging (`?perfProbe=1`) with long-frame and p99 visibility

## Previous highlights (v3.1.1)

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
- Added reproducibility bundle flow:
  - `Save Repro Bundle` exports exact frame state + settings + screenshot.
  - `Load Repro Bundle` restores state, controls, and draggable object locations.
- Added compressed exact-state bundle support (`.json.gz`) for practical sharing and GitHub replication.

## N-Blackholes Refactor Completion Notes

The staged N-blackholes migration is complete.

- Controls model now supports dynamic `blackHoles[]` with backward-compatible legacy field ingestion.
- WebGL/shader transport is array-driven with runtime count and bounded uniform uploads.
- Holes UI supports dynamic add/remove and per-hole controls.
- Canvas dynamics run with dynamic black-hole sets and white-hole interaction.
- Persistence writes canonical `blackHoles[]` payloads and still reads legacy payloads.

### Validation summary

- Typecheck: `npx tsc --noEmit` passed.
- Targeted regression tests passed:
  - `src/webgl/simulationTypes.test.ts`
  - `src/utils/persistence.test.ts`
  - `src/components/OverlayMenu.test.tsx`
  - `src/App.test.tsx`
- Production build: `npm run build` passed.

### Performance guardrails

- Maximum black holes are capped at `16` (`MAX_BLACK_HOLES`) across sanitizer and UI.
- This bounds dynamic CPU-side N-body work and shader-side uniform upload cost.
- Additional deep profiling can be run later for specific devices/scenes.

### Jitter diagnosis mode

Objective metric sampling uses GPU readbacks and is now opt-in to avoid periodic frame stalls in normal runs.
Use these URL query flags to diagnose or re-enable it:

- Baseline smooth run (metrics off): `http://localhost:3000/?perfProbe=1`
- Re-enable objective metric sampling: `http://localhost:3000/?perfProbe=1&metrics=on`
- Change metric sampling cadence (default is `90` frames): `?perfProbe=1&metrics=on&metricsEvery=180`
- Disable CPU hole-dynamics loop to isolate its cost: `?perfProbe=1&metrics=off&holeDynamics=off`

When `perfProbe=1` is enabled, the console logs:

- long frames (`>=22ms`) and whether they happened near a metric sample
- rolling average frame time
- p99 frame time and derived 1% low FPS estimate

This allows an A/B run to confirm or rule out metric readback as the primary source of regular jitter before adding motion buffering.

## Reproducible showcase

This repository now includes a captured scene that can be recreated from GitHub assets.

![e-Life reproducible scene](docs/repro/readme-repro-live.png)

- Repro bundle (exact frame state + settings, compressed): `docs/repro/readme-repro-live.json.gz`
- Repro bundle (uncompressed): `docs/repro/readme-repro-live.json`
- Settings-only export (all menu values + draggable object positions): `docs/repro/readme-repro-live-settings.json`
- Screenshot asset: `docs/repro/readme-repro-live.png`

> Note: exact repro bundles are larger than settings-only files because they include full RGBA simulation buffers for precise frame restoration.
> Use the `.json.gz` bundle for GitHub sharing and normal use.
> Use the settings-only JSON for lightweight sharing when exact pixel-for-pixel reconstruction is not required.

### Recreate the exact scene from GitHub

1. Start the app with `npm start`.
2. Open either menu and click **Load Repro Bundle**.
3. Select `docs/repro/readme-repro-live.json.gz` (or the `.json` variant).
4. The simulator restores controls, object locations, and GPU state to match the screenshot.

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

### Generate new README repro assets

1. Run `npm start`.
2. In another terminal, run:

```bash
npm run capture:repro
```

This refreshes:

- `docs/repro/readme-repro-live.json.gz`
- `docs/repro/readme-repro-live.json`
- `docs/repro/readme-repro-live-settings.json`
- `docs/repro/readme-repro-live.png`

## Key files

- GPU engine: `/src/webgl/lifeEngine.ts`
- Simulation controls/types: `/src/webgl/simulationTypes.ts`
- Conway/holes menu UI: `/src/components/OverlayMenu.tsx`
- Main app composition: `/src/App.tsx`
- Life shader: `/public/shaders/computeLife.frag`
- Gravity/velocity shaders: `/public/shaders/computeGravity.frag`, `/public/shaders/computeVelocity.frag`
- Objective metrics: `/src/simulation/objectiveMetrics.ts`

## Versioning

- Current version: **3.2.0**
- Baseline progression: CPU prototype (v1/v2) → GPU pipeline (v3+) with interactive control expansion.
