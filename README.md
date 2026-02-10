# RedTrack

RedTrack is an alternative to **Minetrack** focused on self-hosting and control.

It supports:
- **Multiple backends** from one client app
- An **Android app** (Capacitor-based frontend)
- Built-in **user management**
- On-site/backend-integrated **server management** from the dashboard UI

## Project structure

- `app/` — Next.js frontend (web + Android wrapper via Capacitor)
- `backend/` — Node.js + Express + MongoDB API service
- `types/` — shared types
- `docs/` — user and developer documentation

## Documentation

- User guide: [`docs/users.md`](docs/users.md)
- Developer guide: [`docs/developers.md`](docs/developers.md)

## Core capabilities

- Track online players and trends
- Manage multiple tracked Minecraft servers
- Manage users and permissions from the UI
- Detect backend disconnects and recover automatically when reachable again
- Deploy frontend as static export (GitHub Pages workflow included)
