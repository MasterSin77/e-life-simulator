# N-Blackholes Refactor Plan

Last updated: 2026-03-09
Owner: Copilot (GPT-5.3-Codex)

## Goals

- Replace fixed black-hole fields (`blackHole`, `blackHole2`, `blackHole3`) with dynamic arrays.
- Support adding/removing black holes at runtime up to a safe GPU-defined maximum.
- Preserve existing behavior via backward compatibility and migration of saved settings/repro bundles.
- Keep build, tests, and TypeScript checks green at every stage.

## Stage Checklist

- [x] Stage 0: Baseline stabilization and discovery
- [x] Stage 1: Data model and schema migration layer
- [x] Stage 2: WebGL uniform transport refactor
- [x] Stage 3: Shader migration to array-driven loops
- [x] Stage 4: UI controls refactor (dynamic black-hole list)
- [x] Stage 5: LifeCanvas interaction/dynamics refactor
- [x] Stage 6: Serialization + repro bundle migration
- [x] Stage 7: Test expansion and regression hardening
- [x] Stage 8: Performance validation + release notes

## Completed Stage Details

### Stage 0 (Completed)

- Build verified: `npm run build` succeeded.
- Typecheck verified: `npx tsc --noEmit` succeeded.
- Test suite stabilized: `src/App.test.tsx` was updated to avoid ambiguous duplicate text matching.
- Test verified: `npm test -- --watchAll=false` passes (4/4 suites, 13/13 tests).
- Architecture discovery completed with two parallel exploration threads:
  - TS/UI/state migration mapping.
  - Shader/WebGL migration mapping.

### Stage 1 (Completed)

- Added array model in controls: `blackHoles: BlackHoleControl[]` in `src/webgl/simulationTypes.ts`.
- Added compatibility sanitization path that supports both:
  - legacy scalar black-hole fields, and
  - new array-based black-hole input.
- Kept legacy scalar fields synchronized from the first three array entries to avoid breaking existing runtime paths.
- Added tests for:
  - array sanitization and clamping,
  - legacy override behavior on top of array inputs.
- Verification:
  - `npm test -- --watchAll=false` passed (4/4 suites, 15/15 tests).
  - `npx tsc --noEmit` completed without reported errors.

### Stage 2 (Completed)

- Added capped black-hole array uniform transport in `src/webgl/lifeEngine.ts`.
- Introduced runtime upload for count plus array forms:
  - `u_numBlackHoles`
  - `u_blackHoleMasses`
  - `u_blackHoleSpins`
  - `u_blackHolesEnabled`
  - `u_blackHolePositions`
  - `u_blackHolesData`
- Kept existing legacy per-hole uniform uploads unchanged for shader backward compatibility pending Stage 3.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test -- --watchAll=false` passed (4/4 suites, 15/15 tests).
  - `npm run build` passed.

### Stage 3 (Completed)

- Migrated black-hole force accumulation in `public/shaders/computeGravity.frag` to runtime array/count loops.
- Migrated well-field accumulation in `public/shaders/computeWells.frag` to runtime array/count loops.
- Stage 3 now consumes Stage 2 uniforms:
  - `u_numBlackHoles`
  - `u_blackHolesData`
  - `u_blackHolesEnabled`
- Preserved existing white-hole behavior and overall force/well structure.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test -- --watchAll=false` passed (4/4 suites, 15/15 tests).
  - `npm run build` passed.

### Stage 4 (Completed)

- Replaced fixed Black Hole 1/2/3 menu sections with dynamic rendering from `controls.blackHoles` in `src/components/OverlayMenu.tsx`.
- Added UI action to add black holes up to `MAX_BLACK_HOLES`.
- Added remove action for extra holes (index >= 3) while preserving first three legacy slots during transition.
- Wired per-hole edits (enabled, mass, x, y, spin) through `onControlsChange({ blackHoles: ... })`.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test -- --watchAll=false` passed (4/4 suites, 15/15 tests).
  - `npm run build` passed.

## Stage In Progress

### Completed (No Active Stage)

- Stage 7 and Stage 8 are complete.
- Refactor rollout is now fully staged and release-ready.

- Stage 6 serialization/repro migration is now complete.
- Canonical persisted `blackHoles[]` payloads now reload correctly without legacy defaults overriding array values.
- Updated import/load sanitization call sites in `src/App.tsx` to sanitize extracted payloads directly.
- Persistence round-trip regression test updated in `src/utils/persistence.test.ts`.
- Verification after Stage 6 completion:
  - `npx tsc --noEmit` passed.
  - Targeted tests passed (19 tests total):
    - `src/webgl/simulationTypes.test.ts`
    - `src/utils/persistence.test.ts`
    - `src/components/OverlayMenu.test.tsx`
    - `src/App.test.tsx`
  - `npm run build` passed.

### Stage 7 (Completed)

- Added regression coverage for dynamic black-hole UI behaviors in `src/components/OverlayMenu.test.tsx`:
  - add-hole flow,
  - remove-hole flow for removable indices,
  - max-cap add-button disabled behavior.
- Added sanitizer cap regression test in `src/webgl/simulationTypes.test.ts`.
- Unified max-hole cap source via `MAX_BLACK_HOLES` export in `src/webgl/simulationTypes.ts` and usage in `src/components/OverlayMenu.tsx`.

### Stage 8 (Completed)

- Performance guardrails finalized:
  - controls sanitizer hard-caps `blackHoles[]` at `MAX_BLACK_HOLES = 16`.
  - UI add flow respects the same cap.
  - shader upload path already limits runtime count to max uniforms.
- Release/readiness verification completed:
  - `npx tsc --noEmit` passed.
  - targeted tests passed.
  - `npm run build` passed.

### Stage 6 (Completed)

- Stage 5 completed in `src/components/LifeCanvas.tsx` with full dynamic-body generalization.
- Orbital/N-body dynamics now iterate across runtime `blackHoles[]` plus white hole.
- Velocity/depth state moved to ID-keyed maps so newly added holes get independent kinematics.
- Spin transfer now accumulates per black-hole ID instead of fixed black-hole slots.
- Preset compatibility path (`setHoleDynamicsState`) remains supported for first three legacy slots.
- Verification after Stage 5 completion:
  - `npx tsc --noEmit` passed.
  - `npm test -- --watchAll=false` passed (4/4 suites, 15/15 tests).
  - `npm run build` passed.

## Implementation Stages

### Stage 1: Data model and schema migration layer

Scope:
- Add `BlackHoleControl` type and `blackHoles: BlackHoleControl[]` to controls model.
- Introduce migration helpers from legacy scalar keys to array model.
- Keep current runtime behavior by deriving legacy fields while migration is in progress.
- Add/adjust unit tests for sanitization and migration.

Definition of done:
- Type-safe controls support both old and new input payloads.
- Existing settings imports continue to work.
- Tests for migration and clamping pass.

### Stage 2: WebGL uniform transport refactor

Scope:
- Replace hard-coded per-hole uniform uploads with packed array uploads.
- Add constants for `MAX_BLACK_HOLES` and runtime clamped count.
- Keep white-hole uniforms separate in this stage.

Definition of done:
- `lifeEngine` sends black-hole arrays to shaders through generic upload path.
- No runtime errors when black-hole count changes between frames.

### Stage 3: Shader migration to array-driven loops

Scope:
- Update `computeGravity.frag` and `computeWells.frag` to iterate up to `u_numBlackHoles` and `MAX_BLACK_HOLES`.
- Remove hard-coded BH1/BH2/BH3 logic while preserving force/well characteristics.

Definition of done:
- Visual output is behaviorally equivalent for first 3 holes.
- Additional holes affect gravity and wells as expected.

### Stage 4: UI controls refactor (dynamic black-hole list)

Scope:
- Replace fixed menu sections with a mapped list.
- Add actions: add hole, remove hole, reset hole, duplicate hole (optional).
- Keep labels and controls clear under larger N.

Definition of done:
- Users can add/remove/tune black holes from UI without code changes.

### Stage 5: LifeCanvas interaction/dynamics refactor

Scope:
- Replace fixed `DragKind` and fixed refs with ID/index-driven dynamic collections.
- Generalize N-body drag/dynamics updates and spin transfer logic.
- Preserve white-hole behavior and controls.

Definition of done:
- Drag handles and orbital dynamics work for variable black-hole count.

### Stage 6: Serialization + repro bundle migration

Scope:
- Bump schemas as needed and add read migration for legacy data.
- Ensure load/save for settings and repro bundles remain compatible.

Definition of done:
- Old files load; new files save with array model.

### Stage 7: Test expansion and regression hardening

Scope:
- Update tests impacted by field renames and dynamic rendering.
- Add tests for migration, max-cap behavior, add/remove flows, and uniform packing.

Definition of done:
- All tests green with new coverage for array model.

### Stage 8: Performance validation + release notes

Scope:
- Measure frame-time behavior at representative counts (`N=3, 8, 16, MAX`).
- Apply practical caps if needed.
- Document changes and migration notes in README/changelog section.

Definition of done:
- Performance expectations documented and acceptable.
- Release notes ready.

## Parallel Workstream Strategy

Use parallel threads only where merge conflicts are minimal:

- Workstream A: Types + migration + tests (`simulationTypes.ts`, tests)
- Workstream B: Engine uniform transport + shader updates (`lifeEngine.ts`, `public/shaders/*`)
- Workstream C: UI + canvas interactions (`OverlayMenu.tsx`, `LifeCanvas.tsx`, related tests)

Merge order:
1. Workstream A
2. Workstream B
3. Workstream C

## Risk Register

- High: Cross-layer coupling between controls, shaders, and drag dynamics.
- High: Runtime perf cost from O(N^2) interactions in `LifeCanvas` dynamics.
- Medium: Legacy schema breakage if migration paths are incomplete.
- Medium: Test brittleness due to duplicated numeric labels in UI.

## Next Action

Refactor stages are complete; next optional work is exploratory tuning (visual presets, perf profiling deeper than build/test gates, and UX polish).
