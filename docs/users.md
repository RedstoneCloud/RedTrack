# User Guide

## Getting started

1. Open RedTrack.
2. Add your backend URL, username, and password.
3. Select your server entry from the list.

## Main page

- **Add new server**: create a new saved backend profile.
- **Support**: use the Discord icon button to open the community support server.

## Dashboard

- View live player metrics and history.
- Use range controls (**Previous 3h**, **Next 3h**, **Now**) to navigate data windows.

## Connection loss handling

If RedTrack cannot reach the backend, a **Connection lost** screen appears instead of leaving a broken view.

- The app keeps retrying automatically in the background.
- You can also press **Retry now**.
- Once the backend is reachable again, the dashboard view returns automatically.

---

## Backend setup tutorial (Linux)

This guide uses Ubuntu/Debian-style commands.

### 1) Install prerequisites

```bash
sudo apt update
sudo apt install -y nodejs npm mongodb
```

> If your distro uses `mongod` from a separate package/repo, install MongoDB using your distro’s official docs.

### 2) Start and enable MongoDB

```bash
sudo systemctl enable --now mongod
sudo systemctl status mongod
```

### 3) Get the backend code and install dependencies

```bash
cd /path/to/RedTrack/backend
npm ci
```

### 4) Create a `.env` file

In `backend/.env`:

```env
mongodb_uri=mongodb://127.0.0.1:27017
ping_rate=10000
backend_port=3001
```

### 5) Start the backend

Development mode:

```bash
npm run dev
```

Production-style run:

```bash
npm run build
npm start
```

### 6) First login

On first boot, RedTrack creates a default admin user:

- Username: `admin`
- Password: `changeme`

Log in and change the password immediately.

---

## Backend setup tutorial (Windows)

### 1) Install prerequisites

- Install **Node.js LTS** from nodejs.org
- Install **MongoDB Community Server** from mongodb.com

### 2) Start MongoDB service

After install, ensure the MongoDB Windows service is running.

In PowerShell (as Administrator):

```powershell
Get-Service MongoDB
Start-Service MongoDB
```

### 3) Install backend dependencies

```powershell
cd C:\path\to\RedTrack\backend
npm ci
```

### 4) Create `.env`

Create `backend\.env` with:

```env
mongodb_uri=mongodb://127.0.0.1:27017
ping_rate=10000
backend_port=3001
```

### 5) Start backend

Development mode:

```powershell
npm run dev
```

Production-style run:

```powershell
npm run build
npm start
```

### 6) Connect from RedTrack app

Use backend URL:

- `http://localhost:3001` (same machine)
- `http://<your-server-ip>:3001` (LAN/remote client)

Then log in with default credentials (`admin` / `changeme`) and change the password.
