# AGENTS.md

Guidance for coding agents working in this repository.

## Scope
These instructions apply to the entire repository unless a deeper `AGENTS.md` overrides them.

## Repository map
- `app/`: Next.js frontend (web + Capacitor wrapper, GitHub Pages export).
- `backend/`: Express + MongoDB API service.
- `docs/`: End-user and developer docs.
- `types/`: Shared type declarations.

## Global rules
- Keep changes tightly scoped to the user request.
- Avoid adding noisy debug logging.
- Preserve existing formatting/style in touched files.
- Update docs when behavior/configuration changes.
- Run relevant checks before committing.

## Validation commands
- Frontend lint:
  ```bash
  npm --prefix app run lint
  ```
- Backend TypeScript build:
  ```bash
  npm --prefix backend run build
  ```

## RedTrack-specific constraints
- GitHub Pages build is served under `/RedTrack` (`app/next.config.ts`).
- Hosted site is `https://redstonecloud.github.io/RedTrack`; browser mixed-content rules apply (hosted HTTPS app cannot call HTTP backend).
- Backend HTTPS mode requires valid cert/key path configuration when enabled.

## Where to put detailed instructions
- Frontend-specific rules live in `app/AGENTS.md`.
- Backend-specific rules live in `backend/AGENTS.md`.
- Follow the most specific AGENTS file for paths you modify.
