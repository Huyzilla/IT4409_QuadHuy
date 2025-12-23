# Deploy public web (Vercel FE + Render BE) while keeping AI + camera local

This guide matches your chosen architecture:
- **Frontend (Vercel)**: public web for viewers
- **Backend (Render)**: public API + WebSocket
- **Video (local)**: MediaMTX running on your machine, exposed via **ngrok HTTPS**
- **AI (local)**: reads RTSP locally and pushes results to Render via `/ingest`

## 0) Why video must be exposed separately
If backend is on Render, it cannot reach your local RTSP (NAT/firewall).
So the browser must fetch video **directly** from a public HLS URL.

## 1) Local machine: run MediaMTX + publishers
From repo root:
- Start the camera stack: `docker compose -f docker-compose.cam.yml up -d`

Note: `docker-compose.cam.yml` sets `MTX_HLSALLOWORIGIN=*` so `hls.js` can fetch HLS cross-origin.

## 2) Local machine: expose HLS via ngrok (HTTPS)
Install ngrok and run:
- `ngrok http 8888`

Copy the **Forwarding https://...** URL.
That becomes your `VITE_HLS_BASE_URL`.

Important:
- FE on Vercel is **https**, so HLS must also be **https** (otherwise mixed-content is blocked).
- Free ngrok URLs change each time you restart ngrok.

## 3) Render: deploy backend
Create a **Web Service** in Render from this repo.

Suggested settings:
- **Root Directory**: `backend`
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm run start:render`

Environment variables (minimum):
- `DATABASE_URL` (Render Postgres connection string)
- `JWT_SECRET`
- `FRONTEND_URLS` = `https://YOUR_VERCEL_APP.vercel.app`

Optional (if you use Redis):
- `REDIS_HOST`, `REDIS_PORT` or your existing Redis config

After deploy, your backend will be:
- API: `https://YOUR_RENDER_SERVICE.onrender.com/api/...`
- WS namespaces:
  - `/ingest`
  - `/traffic`

## 4) Vercel: deploy frontend
Create a Vercel project from this repo.

Settings:
- **Root Directory**: `my-react-app`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

Environment variables:
- `VITE_BACKEND_URL` = `https://YOUR_RENDER_SERVICE.onrender.com`
- `VITE_API_BASE_URL` = `https://YOUR_RENDER_SERVICE.onrender.com/api` (optional)
- `VITE_SOCKET_BASE_URL` = `https://YOUR_RENDER_SERVICE.onrender.com` (optional)
- `VITE_HLS_BASE_URL` = `https://YOUR_NGROK_DOMAIN` (from step 2)

## 5) Local machine: run AI and point it to Render
In `ai/.env` or shell env:
- `BACKEND_URL=https://YOUR_RENDER_SERVICE.onrender.com`
- `NAMESPACE=/ingest`

Then run AI:
- `python ai_service.py`

## 6) Smoke test checklist
- Open Vercel FE → login works
- Dashboard loads intersections/cameras from Render
- Live video plays (HLS requests go to your ngrok domain)
- AI logs show connected to Render (`/ingest`)
- FE receives realtime updates (`/traffic`)

## If you want a stable video URL (recommended)
Ngrok free URL changes often. For stable production-like access, use **Cloudflare Tunnel** or a VPS reverse proxy.

## Option B) Expose HLS via Cloudflare Tunnel (stable HTTPS)
This is the recommended replacement for free ngrok URLs.

What you can and cannot expose:
- ✅ HLS over HTTP/HTTPS (MediaMTX port 8888) works well via Cloudflare Tunnel.
- ❌ RTSP (port 8554) is raw TCP; Cloudflare Tunnel won’t expose it publicly unless you use paid products (e.g. Spectrum). That’s OK because **AI reads RTSP locally**.

### B1) Create a tunnel token
In Cloudflare Zero Trust Dashboard:
- **Networks → Tunnels → Create a tunnel**
- Copy the **token** for the tunnel.

Put it in a local env file:
- Copy `.env.tunnel.example` → `.env.tunnel`
- Set `CF_TUNNEL_TOKEN=...`

### B2) Run the tunnel container (same docker network as MediaMTX)
From repo root:
- Ensure the shared network exists once: `docker network create traffic-net`
- Start MediaMTX stack if not running: `docker compose -f docker-compose.cam.yml up -d`
- Start Cloudflare tunnel: `docker compose --env-file .env.tunnel -f docker-compose.tunnel.yml up -d`

### B3) Create a Public Hostname that points to MediaMTX HLS
In Cloudflare Zero Trust Dashboard:
- Open your tunnel → **Public Hostname** → **Add a public hostname**
- Hostname: `hls.yourdomain.com`
- Service:
  - Type: `HTTP`
  - URL: `http://mediamtx:8888`

Then set FE env:
- `VITE_HLS_BASE_URL=https://hls.yourdomain.com`

Notes:
- `docker-compose.cam.yml` already sets `MTX_HLSALLOWORIGIN=*` so browsers can fetch HLS cross-origin.
- If playback stutters, add a Cloudflare Cache Rule to bypass caching for `*.m3u8` and `*.ts`.
