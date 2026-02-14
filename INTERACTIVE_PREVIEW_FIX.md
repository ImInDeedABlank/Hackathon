# Interactive Preview Fix Report

## Findings From Git History

- Searched history for preview-related changes with:
  - `git log --oneline --decorate --all --grep="interactive" --grep="preview" --regexp-ignore-case`
  - `git log --oneline --decorate -S "Interactive preview unavailable on this device" -- app/components/landing/WebGLHeroScene.tsx`
  - `git diff 410fe18..15554ce -- app/components/landing/WebGLHeroScene.tsx`
- The relevant regression landed in commit `15554ce` (`almost all frontend is done just needs polishing`).
- Before this commit (`410fe18`), `WebGLHeroScene` used direct renderer construction:
  - `new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" })`
- In `15554ce`, the component was changed to:
  - Manually pre-create and pass WebGL context (`canvas.getContext(...)` + `context: gl`)
  - Add fallback UI path ("Interactive preview unavailable on this device")
  - Keep aggressive cleanup with context loss semantics

## Likely Root Cause

- The manual context preflight + renderer init path introduced a stricter failure mode where renderer/context initialization can fail more often on some devices/environments.
- Cleanup behavior around WebGL context loss is risky with React effect re-runs in development and can cause repeated fallback states.
- Result: interactive preview falls back too aggressively, even in environments that previously rendered successfully.

## What Was Changed

File: `app/components/landing/WebGLHeroScene.tsx`

- Restored safer renderer initialization path:
  - Removed manual `canvas.getContext(...)` preflight usage.
  - Use `THREE.WebGLRenderer` constructor directly with `powerPreference: "high-performance"`.
- Kept fallback UI, but made it deterministic:
  - Added `hideFallback()` at effect start to reset canvas/fallback visibility correctly.
- Added context-loss handling:
  - Listen for `webglcontextlost` and show fallback if context is actually lost.
- Reduced cleanup risk:
  - Removed explicit `forceContextLoss()` call.
  - Retained regular `dispose()` cleanup for renderer/material/geometry resources.

## Manual Test Steps

1. Run app and open `/main`.
2. Confirm the hero WebGL card renders animated 3D content (not fallback text) on supported devices.
3. Move pointer across the card and confirm camera parallax still responds.
4. Toggle theme and confirm the preview still renders.
5. Throttle CPU/network or reload repeatedly and confirm preview does not immediately drop to fallback.
6. Validate fallback still appears if WebGL is actually unavailable (e.g., browser with WebGL disabled).
