# AGENTS.md

Guidance for coding agents working in this repository.

## Scope
These instructions apply to the entire repository unless a deeper `AGENTS.md` overrides them.

## Project overview
- `app/`: Next.js frontend (also used in GitHub Pages and Capacitor builds).
- `backend/`: Node.js + Express + MongoDB API.
- `docs/`: User and developer docs.
- `types/`: Shared typings.

## Common workflows
- Frontend lint:
  ```bash
  npm --prefix app run lint
  ```
- Backend type build:
  ```bash
  npm --prefix backend run build
  ```

## Notes specific to this repo
- GitHub Pages build uses `/RedTrack` base path (`app/next.config.ts`); keep this in mind for static/public asset URLs used in Pages mode.
- When updating docs for hosted usage (`https://redstonecloud.github.io/RedTrack`), call out browser mixed-content constraints (hosted HTTPS page cannot call HTTP backend).
- Backend HTTPS mode expects configured certificate/key paths when enabled.

## Change discipline
- Keep changes minimal and scoped to the request.
- Avoid introducing noisy debug logs in frontend/backend.
- Update docs when behavior or required configuration changes.
- Run relevant checks for touched areas before committing.
