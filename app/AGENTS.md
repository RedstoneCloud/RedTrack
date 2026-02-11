# AGENTS.md (app)

Frontend-specific instructions for files under `app/`.

## Scope
Applies to all files in `app/` and subdirectories unless overridden deeper.

## Tech/context
- Next.js pages router (`app/pages`).
- Static export target (`output: 'export'`).
- Pages-mode base path can be `/RedTrack`.

## Frontend implementation guidelines
- For assets from `public/`, ensure URLs work for both root and Pages base-path builds.
- Prefer existing shared utilities/components over introducing new patterns.
- Keep UI behavior changes minimal unless explicitly requested.
- Do not add temporary debug `console.log` output.

## Frontend checks
Run when frontend files change:
```bash
npm --prefix app run lint
```

If lint fails due environment/tooling issues, report the exact error in the final summary.
