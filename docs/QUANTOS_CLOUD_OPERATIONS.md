# QUANT.OS — Institutional Cloud Deployment, Security & Operations Manual

**Authoritative Target Environment:** Render (Backend, Gateway, Persistent PostgreSQL) & Vercel (Frontend Next.js)  
**Target Repository:** `darshancafe2019-boop/algo-code-latest`  
**Deployment Branch:** `deploy/render-vercel-production`  
**Production Active Region:** Singapore (`sin` / `ap-southeast-1`)  
**Security Level:** Level-4 Institutional Hardened, Strict Zero-Trust, Fail-Closed  

---

## Executive Summary & Architecture Overview

Quant.OS is a high-frequency, multi-broker, multi-asset quantitative trading platform. The cloud architecture decouples real-time WebSocket market streaming, transactional REST APIs, and modern reactive user interfaces into resilient micro-services backed by an authoritative PostgreSQL persistence engine.

```
+---------------------------------------------------------------------------------------+
|                                    VERCEL EDGE NETWORK                                |
|                                                                                       |
|   Next.js 14 App Router (Node.js 18+ runtime)                                         |
|   Domain: https://quantos.vercel.app (or custom production domain)                     |
|   Static Assets + SSR + Server-Side Streaming Proxies                                 |
+---------------------------------------------------------------------------------------+
                |                                               |
                | HTTPS / REST (Auth, Orders, Bots)              | WSS Proxy (Stream API)
                v                                               v
+-----------------------------------------------+   +-----------------------------------+
|               RENDER BACKEND                  |   |          RENDER GATEWAY           |
|                                               |   |                                   |
| Service: quantos-backend                      |   | Service: quantos-gateway          |
| Type: Python Web Service (Gunicorn / WSGI)    |   | Type: Python Web Service (aiohttp)|
| Port: 5050 (Dual Bridge: 5000)                |   | Port: 5051                        |
| Region: Singapore (singapore)                 |   | Region: Singapore (singapore)     |
| Scaling: Min 1 Instance (Worker dyno)         |   | Stream: Multi-Broker Live Tickers |
+-----------------------------------------------+   +-----------------------------------+
        |                       ^                                   |
        | SQL Queries           | Bot Commands / Signals            | Market Quotes
        v                       v                                   v
+---------------------------------------------------------------------------------------+
|                         RENDER POSTGRESQL 16 PERSISTENCE                              |
|                                                                                       |
| Database: quantos-staging-db                                                          |
| Region: Singapore (singapore)                                                         |
| Engine: PostgreSQL 16.x with psycopg3 connection pooling (min=1, max=10)             |
| Tables: 144 authoritative tables (bots, trades, orders, security_sessions, users, ...) |
| Fail-Closed Strategy: Fatal abort on unreachable DB; zero ephemeral SQLite split-brain|
+---------------------------------------------------------------------------------------+
```

---

## 1. Database Lifecycle & Critical Expiry Countdown

> [!WARNING]
> ### RENDER FREE TIER POSTGRESQL EXPIRY NOTICE
> **Target Database:** `quantos-staging-db`  
> **Instance Region:** Singapore (`singapore`)  
> **Free Tier Hard Expiry Date:** **November 16, 2026**  
> Render Free Tier PostgreSQL databases are spun down and destroyed automatically 30 days after creation.
> **Action Required Before November 16, 2026:**
> 1. Upgrade the instance to an active paid plan (Starter $7/month or Standard $15/month) within the Render Dashboard to retain data seamlessly without IP or connection string churn.
> 2. Alternatively, create an automated nightly backup via `pg_dump` and store encrypted snapshots in secure object storage.

### Point-in-Time Database Backup Procedure
Before initiating migrations, schema updates, or infrastructure teardowns, execute an authoritative snapshot:

```bash
# 1. Local SQLite Point-in-Time ACID Snapshot (Verified)
python -c "import sqlite3; s=sqlite3.connect('data/trading_bot.db'); b=sqlite3.connect('backup/trading_bot_pre_cutover.db'); s.backup(b); b.close(); s.close(); print('[OK] Local DB snapshotted.')"

# 2. Remote PostgreSQL Cloud Snapshot (pg_dump)
pg_dump "$DATABASE_URL" \
  --format=custom \
  --clean \
  --no-owner \
  --no-privileges \
  --file="backup/quantos_pg_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### PostgreSQL Schema & Data Migration Run
To migrate authoritative SQLite data (including all 22 bots, 21,800+ trades and orders, and institutional audit events) to PostgreSQL:

```bash
# Dry-run validation (Offline, zero side-effects)
python scripts/migrate_sqlite_to_postgres.py --dry-run

# Authoritative migration execution into Singapore PostgreSQL
python scripts/migrate_sqlite_to_postgres.py \
  --pg-url="postgresql://<user>:<password>@<render-pg-host>/<database>" \
  --sqlite-path="data/trading_bot.db"
```

---

## 2. Environment Variables Matrix

### Render Backend (`quantos-backend`)
| Variable | Value / Format | Security Policy | Purpose |
| :--- | :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` | Static | Python runtime version lock |
| `DATABASE_PROVIDER` | `postgresql` | Plaintext | Authoritative database selector |
| `DATABASE_URL` | `postgresql://...` | Secret (Render DB) | Authoritative Singapore PostgreSQL connection string |
| `FORCE_SQLITE` | `false` | Plaintext | Fail-closed enforcement; disables SQLite fallback |
| `AUTH_REQUIRE_LOGIN` | `true` | Plaintext | Enforces mandatory session authentication |
| `AUTH_SESSION_SECRET` | 64-char hex string | Secret | Cryptographic session cookie HMAC signature |
| `AUTH_TOTP_ENCRYPTION_KEY`| 32-byte Fernet base64 | Secret | Envelope encryption key for TOTP secrets and broker tokens |
| `GATEWAY_SECRET` | High-entropy secret | Secret | Shared HMAC secret for Backend-to-Gateway internal auth |
| `FRONTEND_URL` | `https://quantos.vercel.app`| Config | Strict CORS origin verification |
| `TRADING_MODE` | `PAPER` | Fail-Closed | Enforces zero real-money order routing |
| `LIVE_TRADING_ENABLED` | `false` | Fail-Closed | Master live trading gate; strictly disabled |
| `PORT` | `5050` | Render managed | Backend HTTP WSGI port |

### Render Gateway (`quantos-gateway`)
| Variable | Value / Format | Security Policy | Purpose |
| :--- | :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` | Static | Python runtime version lock |
| `PORT` | `5051` | Render managed | Gateway aiohttp server port |
| `GATEWAY_SECRET` | High-entropy secret | Secret | Mandatory authentication for non-loopback WebSocket clients |
| `BACKEND_INTERNAL_URL` | `http://quantos-backend:5050` | Internal DNS | Internal network resolution for trade reconciliation |
| `FEED_MODE` | `LIVE` | Config | Direct market quote feed streaming |

### Vercel Frontend
| Variable | Value / Format | Exposure | Purpose |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://quantos-backend.onrender.com` | Public Client | Backend REST API root |
| `NEXT_PUBLIC_GATEWAY_WS_URL`| `wss://quantos-gateway.onrender.com` | Public Client | Live market tick WebSocket |
| `BACKEND_INTERNAL_URL` | `https://quantos-backend.onrender.com` | Server-Side Only | Server actions and SSR proxy target |
| `GATEWAY_SECRET` | High-entropy secret | Server-Side Only | Server-side WebSocket proxy authentication (never client) |

---

## 3. Step-by-Step Deployment Runbook

### Phase A: Render Blueprint Deployment
1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Navigate to **Blueprints** -> **New Blueprint Instance**.
3. Connect repository `darshancafe2019-boop/algo-code-latest` and select branch `deploy/render-vercel-production`.
4. Render will parse `render.yaml` and discover:
   - `quantos-backend` (Web Service, Singapore)
   - `quantos-gateway` (Web Service, Singapore)
   - Link existing database: Attach `quantos-staging-db` as `DATABASE_URL`.
5. Enter required environment secrets in the Render Web UI:
   - `AUTH_SESSION_SECRET` (Generate with `openssl rand -hex 32`)
   - `AUTH_TOTP_ENCRYPTION_KEY` (Generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)
   - `GATEWAY_SECRET` (Generate with `openssl rand -hex 24`)
6. Click **Apply Blueprint**.

### Phase B: Vercel Frontend Deployment
1. Log in to the [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import GitHub repository `darshancafe2019-boop/algo-code-latest`.
4. Configure Project Settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
5. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://quantos-backend.onrender.com`
   - `NEXT_PUBLIC_GATEWAY_WS_URL` = `wss://quantos-gateway.onrender.com`
   - `BACKEND_INTERNAL_URL` = `https://quantos-backend.onrender.com`
   - `GATEWAY_SECRET` = `<SAME_GATEWAY_SECRET_AS_RENDER>`
6. Deploy the project and record the generated Vercel production URL.
7. Return to Render Dashboard, open `quantos-backend` -> **Environment**, update `FRONTEND_URL` to match the exact Vercel URL (e.g., `https://quantos.vercel.app`), and trigger manual redeploy.

---

## 4. Verification & Health Probes

Execute the following automated smoke tests immediately following cutover:

```bash
# 1. Health Probes
curl -i https://quantos-backend.onrender.com/health/live
# Expected: HTTP 200 OK {"status":"healthy"}

curl -i https://quantos-backend.onrender.com/api/health/dependencies
# Expected: HTTP 200 OK {"database":"CONNECTED","provider":"postgresql"}

curl -i https://quantos-gateway.onrender.com/health
# Expected: HTTP 200 OK with adapter matrix

# 2. Security Auth Gate Rejection (Negative Smoke Test)
curl -i https://quantos-backend.onrender.com/api/bots
# Expected: HTTP 401 UNAUTHORIZED {"error_code":"UNAUTHORIZED"}

curl -i https://quantos-backend.onrender.com/api/dhan/funds
# Expected: HTTP 401 UNAUTHORIZED {"error_code":"UNAUTHORIZED"}

# 3. CORS Enforcement Test
curl -i -X OPTIONS https://quantos-backend.onrender.com/api/bots \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST"
# Expected: Access-Control-Allow-Origin header is NOT present.
```

---

## 5. Incident Response & Troubleshooting Runbook

### Incident 1: Backend Fails to Start (`FATAL: Primary backend port is occupied` or Database Error)
- **Symptom:** Render backend deployment fails or crashes continuously during boot.
- **Cause:** Render dynamically injects `PORT`. In `dashboard.py`, `int(os.getenv("PORT", 5050))` binds correctly. If `DATABASE_URL` is missing or credentials expired, `src/config.py` raises `RuntimeError` due to fail-closed configuration.
- **Resolution:**
  1. Inspect Render logs: `dashboard.render.com` -> `quantos-backend` -> **Logs**.
  2. Verify `DATABASE_URL` is present and valid. Test connection string locally using `psql "$DATABASE_URL"`.
  3. Ensure `FORCE_SQLITE=false` is set only when `DATABASE_URL` is active.

### Incident 2: Frontend Throws CORS Error (`Blocked by CORS Policy`)
- **Symptom:** Browser console displays `Access to fetch at ... has been blocked by CORS policy`.
- **Cause:** Exact origin mismatch between Vercel URL and backend `FRONTEND_URL`.
- **Resolution:**
  1. Verify the exact origin in browser Network tab (e.g., `https://quantos-frontend.vercel.app`).
  2. In Render `quantos-backend` environment settings, set `ALLOWED_CORS_ORIGINS` to include all custom domains or preview URLs (comma-separated).
  3. Redeploy backend service.

### Incident 3: Gateway WebSocket Connection Dropping (`HTTP 401 / GATEWAY_UNAUTHORIZED`)
- **Symptom:** Next.js frontend streaming endpoint logs `WebSocket connection closed: 401`.
- **Cause:** `GATEWAY_SECRET` mismatch between Vercel server environment and Render gateway environment.
- **Resolution:**
  1. Verify `GATEWAY_SECRET` on Render matches Vercel environment variables exactly.
  2. Ensure header `X-Gateway-Secret` is transmitted without leading/trailing whitespace.

### Incident 4: Global Trading Kill Switch Activation
- **Symptom:** Emergency market volatility or broker connectivity loss requires halting all fleet activity.
- **Immediate Action:**
  1. Authenticate to Quant.OS Dashboard as `ADMIN`.
  2. Click **Emergency Kill Switch** on the header navigation bar, or call:
     ```bash
     curl -X POST https://quantos-backend.onrender.com/api/kill-switch \
       -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>" \
       -H "X-CSRF-Token: <CSRF_TOKEN>" \
       -H "Content-Type: application/json" \
       -d '{"action": "activate", "reason": "Emergency operational pause"}'
     ```
  3. All paper bot loops immediately halt order execution and log audit event `KILL_SWITCH_ACTIVATED`.

---

## 6. Zero-Downtime Rollback Procedure

If unexpected regressions occur in production:

### Vercel Instant Rollback (Frontend)
1. Navigate to **Vercel Dashboard** -> **Project** -> **Deployments**.
2. Locate the previous stable deployment (e.g., run #8 `60252ae`).
3. Click **...** (Options) -> **Instant Rollback**.
4. Traffic routes to the prior build within 300ms globally without rebuilding.

### Render Rollback (Backend / Gateway)
1. Navigate to **Render Dashboard** -> `quantos-backend` -> **Deploys**.
2. Select the prior verified commit and click **Rollback to this deploy**.
3. Repeat for `quantos-gateway` if gateway changes were part of the release.
