# Developer Guide

## Prerequisites

- Node.js 20+
- npm (or pnpm if preferred)

## Local development

From `app/`:

```bash
npm ci
npm run dev
```

From `backend/` (if required by your local workflow), run the backend service separately.

## Build

Frontend static export:

```bash
cd app
npm run build
```

`app/next.config.ts` is configured with `output: 'export'`, so the build output is generated in `app/out/`.

## Lint

```bash
cd app
npm run lint
```

## GitHub Pages deployment

A workflow is provided at `.github/workflows/deploy-pages.yml`.

- It installs frontend dependencies in `app/`.
- Builds the static Next.js export.
- Publishes `app/out` to GitHub Pages.

To use it, enable **GitHub Pages** in repository settings with source set to **GitHub Actions**.
