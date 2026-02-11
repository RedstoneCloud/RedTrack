# AGENTS.md (backend)

Backend-specific instructions for files under `backend/`.

## Scope
Applies to all files in `backend/` and subdirectories unless overridden deeper.

## Tech/context
- Node.js + Express API.
- MongoDB via Mongoose.
- TypeScript project compiled with `tsc`.

## Backend implementation guidelines
- Keep auth/session and permission checks explicit; avoid silent security behavior changes.
- When HTTPS mode is enabled, keep certificate/key requirements strict and fail fast on invalid config.
- Avoid logging sensitive request payloads or credentials.
- Preserve route behavior and response shapes unless user requests API changes.

## Backend checks
Run when backend files change:
```bash
npm --prefix backend run build
```
