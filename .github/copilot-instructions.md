# Copilot Working Rules (Speed Mode)

- Prioritize fast turnaround.
- Do not run exhaustive/full test suites unless explicitly requested.
- Do not use watch mode (`--watch`, dev servers for validation).
- Only run minimal verification: TypeScript check and targeted tests for changed files.
- If a command runs longer than 2 minutes, stop and report.

## Default Validation Order

1. `npx tsc --noEmit`
2. Targeted test file(s) only when relevant

## Execution Policy

- Never run exhaustive test suites unless explicitly requested.
- Never run watch mode (`--watch`, dev servers for validation).
- If any command appears stalled or exceeds 120 seconds, stop and summarize.
