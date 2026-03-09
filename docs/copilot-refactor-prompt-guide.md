# Copilot Prompt Guide: N-Blackholes Refactor

Last updated: 2026-03-08
Model: GPT-5.3-Codex

## Purpose

Use these prompts to drive parallel implementation threads while keeping work scoped and mergeable.

## Global Rules For Every Thread

- Keep behavior equivalent for existing 3-hole defaults unless the task explicitly changes behavior.
- Preserve backward compatibility for settings/repro imports.
- Keep edits ASCII and minimal.
- Run targeted tests after each change set and summarize results.
- Do not touch unrelated files.

## Thread Prompts

### Thread A: Types and Migration

Prompt:
"Implement Stage 1 in this repository. Add array-based black-hole controls to `SimulationControls` with backward-compatible migration from legacy scalar fields. Update sanitization and defaults. Add or update tests in `src/webgl/simulationTypes.test.ts` to verify clamping, migration, and default behavior. Keep public API stable where possible."

Expected outputs:
- Updated `src/webgl/simulationTypes.ts`
- Updated `src/webgl/simulationTypes.test.ts`
- Short migration notes in commit message/body

### Thread B: Engine and Shader Uniforms

Prompt:
"Implement Stage 2 and Stage 3 for this repository. Refactor `lifeEngine.ts` to upload black-hole arrays to shaders with count + packed data and max-cap handling. Refactor `computeGravity.frag` and `computeWells.frag` to loop over black holes using `MAX_BLACK_HOLES` and runtime count. Keep visual behavior equivalent for 3 holes."

Expected outputs:
- Updated `src/webgl/lifeEngine.ts`
- Updated `public/shaders/computeGravity.frag`
- Updated `public/shaders/computeWells.frag`
- Validation notes for uniform limits and performance

### Thread C: UI and Interaction

Prompt:
"Implement Stage 4 and Stage 5 in this repository. Convert hole control UI and drag/dynamics logic from fixed blackHole/blackHole2/blackHole3 to dynamic black-hole arrays with add/remove controls. Keep white-hole controls intact. Update tests affected by dynamic rendering."

Expected outputs:
- Updated `src/components/OverlayMenu.tsx`
- Updated `src/components/LifeCanvas.tsx`
- Updated relevant tests

## Integration Prompt

Prompt:
"Integrate completed Stage 1-5 changes from parallel threads. Resolve type and behavior conflicts, prioritize backward compatibility, and ensure a single coherent controls model. Run `npm run build`, `npx tsc --noEmit`, and `npm test -- --watchAll=false`. Report pass/fail and residual risks."

## Validation Prompt

Prompt:
"Run Stage 6-8 completion checks: settings/repro migration compatibility, regression tests, and performance spot checks for N=3, 8, 16, and max configured holes. Produce release notes with migration caveats."

## Stage Checkoff Protocol

For each stage:
1. Mark stage as in progress in `docs/n-blackholes-implementation-plan.md`.
2. Implement scoped changes.
3. Run required verification commands.
4. Mark stage complete with date and result summary.

## Required Verification Commands

- `npm run build`
- `npx tsc --noEmit`
- `npm test -- --watchAll=false`

Use targeted test commands during development, then run full verification before stage signoff.
