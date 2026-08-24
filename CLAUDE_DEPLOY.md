# Merge Dice Heroes — Claude Deployment Handoff

This repository contains the current React/Vite browser-game source. The validated state includes the chibi castle lobby, pure in-lobby team management, persistent hero experience, interactive chapter maps, chapter unlock feedback, and the latest user-supplied HUD and UI artwork.

## Local setup

```bash
pnpm install
pnpm dev
```

Use `pnpm lint && pnpm test && pnpm check && pnpm build` before deployment. The current test suite contains 35 tests.

## Asset bundle

The companion deployment archive includes an `assets/` folder containing the high-resolution source assets used by the project, including hero sprite sheets, portraits, castle UI frames, HUD resource icons, and other uploaded artwork. The app currently references several managed `/manus-storage/...` paths. For an external Claude deployment, upload matching files from `assets/` to the chosen static host and replace those paths with the corresponding hosted URLs or local static paths.

## Important implementation notes

The lobby is deliberately mobile-first and fixed to one portrait viewport. The chapter-map screen is presentation-only: it shows current progress but leaves `開始遠征` as the sole combat-launch path. The team manager must remain a lobby overlay and must not route through the expedition start sequence.

Do not rewrite hero sprite dimensions or crop individual frames. Their original canvases, baseline alignment, and alpha cleanup are integral to the board and health-bar safe areas.
