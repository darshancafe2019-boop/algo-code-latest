# QUANT.OS — Institutional Cloud Deployment, Security & Operations Manual

**Intended Target Environment:** Render (Backend and Gateway) & Vercel (Frontend Next.js)
**Target Repository:** `darshancafe2019-boop/algo-code-latest`  
**Deployment Branch:** Confirm the active branch in the hosting dashboards
**Production Region and database plan:** Confirm in Render before migration or backup planning

---

## Executive Summary & Architecture Overview

The repository's Render blueprint intends to use PostgreSQL, but a blueprint is not proof of the live service's environment. The reported production readiness response identifies SQLite. The active Render variables, database resource, region, plan, and stored data must be confirmed in the Render dashboard before changing the database.

```
+---------------------------------------------------------------------------------------+
|                                    VERCEL EDGE NETWORK                                |
|                                                                                       |
|   Next.js frontend (Vercel deployment)                                                 |
|   Domain: https://algo-code-latest.vercel.app                                         |
|   Static Assets + SSR + Server-Side Streaming Proxies                                 |
+---------------------------------------------------------------------------------------+
                |                                               |
                | HTTPS / REST (Auth, Orders, Bots)              | WSS Proxy (Stream API)
                v                                               v
+-----------------------------------------------+   +-----------------------------------+
|               RENDER BACKEND                  |   |          RENDER GATEWAY           |
|                                               |   |                                   |
| Service: verify active Render service name    |   | Service: verify active service    |
| Type: Python Web Service (Gunicorn / WSGI)    |   | Type: Python Web Service (aiohttp)|
| Port: Render-managed                          |   | Port: Render-managed              |
| Region and scaling: verify in Render          |   | Region and scaling: verify        |
+-----------------------------------------------+   +-----------------------------------+
        |                       ^                                   |
        | SQL Queries           | Bot Commands / Signals            | Market Quotes
        v                       v                                   v
+---------------------------------------------------------------------------------------+
|                      DATABASE CONFIGURED IN RENDER                                   |
|                                                                                       |
| Intended engine: PostgreSQL; live engine must be checked at /health/ready             |
| Database name, region, plan, and data: not confirmed by repository configuration       |
| Keep DATABASE_URL in Render's secret environment settings                             |
+---------------------------------------------------------------------------------------+
```

---

## 1. Database Lifecycle and Backups

> [!WARNING]
> The live Render database resource, plan, expiry/retention terms, region, and connection URL have not been inspected. Verify these in Render; do not infer them from this document or the blueprint.

### Point-in-Time Database Backup Procedure
Before initiating migrations, schema updates, or infrastructure teardowns, execute an authoritative snapshot:

```bash
# Example only: replace both paths with the confirmed source path and protected backup destination.
python -c "import sqlite3; s=sqlite3.connect('data/trading_bot.db'); b=sqlite3.connect('backup/trading_bot_pre_cutover.db'); s.backup(b); print(b.execute('PRAGMA integrity_check').fetchone()[0]); b.close(); s.close()"

# 2. Remote PostgreSQL Cloud Snapshot (pg_dump)
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="backup/quantos_pg_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### PostgreSQL Schema and Data Migration
The migration utility is additive: it uses `ON CONFLICT DO NOTHING`, so it does not overwrite conflicting target rows. A successful run can therefore leave source and target records different. Review its per-table counts and run its verification mode before cutover. Never point production at an empty target or run a migration against a populated target without a verified backup and a written conflict/data-preservation plan.

```bash
# Source-only dry run (no PostgreSQL URL; no database writes)
python scripts/migrate_sqlite_to_postgres.py --pg-url "" --dry-run

# Execute only against an approved disposable/empty target, with its URL injected
# into DATABASE_URL by a secret manager or protected process environment.
python scripts/migrate_sqlite_to_postgres.py --sqlite-path="data/trading_bot.db"
```

---

## 2. Environment Variables Matrix

### Render Backend (`quantos-backend`)
| Variable | Value / Format | Security Policy | Purpose |
| :--- | :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` | Static | Python runtime version lock |
| `DATABASE_PROVIDER` | `postgresql` | Plaintext | Authoritative database selector |
| `DATABASE_URL` | `postgresql://...` | Secret (Render DB) | Authoritative PostgreSQL connection string |
| `FORCE_SQLITE` | `false` | Plaintext | SQLite override; production startup rejects `true` |
| `APP_ENV` / `FLASK_ENV` | `production` | Plaintext | Production mode; Render service detection is also supported |
| `DB_PATH` | Unset | Plaintext | SQLite path only; not a production persistence solution |
| `AUTH_REQUIRE_LOGIN` | `true` | Plaintext | Enforces mandatory session authentication |
| `AUTH_BOOTSTRAP_ENABLED` | `true` | Plaintext | Creates the initial admin account when the database is empty |
| `AUTH_BOOTSTRAP_USERNAME` | `admin` | Plaintext | Initial administrator username |
| `AUTH_BOOTSTRAP_PASSWORD` | Strong unique password | Secret | Initial administrator password; required for first-time bootstrap |
| `AUTH_ADMIN_EMAIL` / `AUTH_BOOTSTRAP_EMAIL` | Login mailbox | Secret/config | Must match the administrator's authorized email address |
| `AUTH_SESSION_SECRET` | 64-char hex string | Secret | Cryptographic session cookie HMAC signature |
| `AUTH_TOTP_ENCRYPTION_KEY`| 32-byte Fernet base64 | Secret | Envelope encryption key for TOTP secrets and broker tokens |
| `RESEND_API_KEY` | Resend API key | Secret | Sends production login and password-reset OTP messages |
| `AUTH_EMAIL_FROM` | Verified sender address | Config | Must be an allowed sender in the Resend account |
| `GATEWAY_SECRET` | High-entropy secret | Secret | Shared HMAC secret for Backend-to-Gateway internal auth |
| `FRONTEND_URL` / `APP_PUBLIC_URL` | `https://algo-code-latest.vercel.app` | Config | Frontend origin and public URL |
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
| `BACKEND_INTERNAL_URL` | `https://algo-code-latest.onrender.com` | Server-Side Only | Server-side API proxy target; set for Production and Preview |
| `MARKET_GATEWAY_URL` | Render gateway HTTPS URL | Server-Side Only | Optional server-side gateway proxy target |
| `NEXT_PUBLIC_GATEWAY_WS_URL` | Render gateway WSS URL | Public Client | Live market tick WebSocket, if enabled |
| `GATEWAY_SECRET` | High-entropy secret | Server-Side Only | Server-side WebSocket proxy authentication (never client) |

---

## 3. Step-by-Step Deployment Runbook

### Phase A: Render Blueprint Deployment
1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Navigate to **Blueprints** -> **New Blueprint Instance**.
3. Connect repository `darshancafe2019-boop/algo-code-latest` and select branch `main` (the branch specified for this deployment).
4. Render will parse `render.yaml` and discover:
   - `quantos-backend` (Web Service; verify this matches the active service before applying)
   - `quantos-gateway` (Web Service; verify this matches the active service before applying)
   - The blueprint does not provision a PostgreSQL database; link the intended database only after verifying its contents and backup.
5. Enter required environment secrets in the Render Web UI:
   - `AUTH_SESSION_SECRET` (Generate with `openssl rand -hex 32`)
   - `AUTH_TOTP_ENCRYPTION_KEY` (Generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)
   - `GATEWAY_SECRET` (Generate with `openssl rand -hex 24`)
   - `AUTH_BOOTSTRAP_PASSWORD` (only needed to create the initial admin; never use a development password)
   - `AUTH_ADMIN_EMAIL` and `AUTH_BOOTSTRAP_EMAIL` (set both to the mailbox that should receive login OTPs)
   - `RESEND_API_KEY` and a Resend-verified `AUTH_EMAIL_FROM` sender
   - Confirm which existing database is attached, and set its internal connection string as `DATABASE_URL`. Do not attach an empty database as a cutover until SQLite data is backed up, migrated, and verified.
6. Review Render's proposed changes against the current services. Do not apply changes that recreate services, replace `DATABASE_URL`, or switch databases until the active data has a verified backup and migration plan.

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
   - `BACKEND_INTERNAL_URL` = `https://algo-code-latest.onrender.com` (Production; set Preview only if preview deployments should access production data)
   - `GATEWAY_SECRET` = `<SAME_GATEWAY_SECRET_AS_RENDER>`
6. Deploy the project and record the generated Vercel production URL.
7. Return to the active Render backend service, set `FRONTEND_URL` and `APP_PUBLIC_URL` to `https://algo-code-latest.vercel.app`, then redeploy.

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

### Incident 4: Login OTP Not Delivered or Administrator Cannot Sign In
- **Symptom:** The Vercel login screen loads, but no verification email arrives or the login remains unauthenticated.
- **Known failure:** A Render log entry with `Path: POST /api/auth/send-otp` and `Error: disk I/O error`, together with `/api/health/live` reporting `db.engine: "sqlite"`, identifies a failing SQLite write. This is a backend storage/database problem, not a Vercel cookie or CORS problem.
- **What is not yet known:** The exception does not identify whether SQLite failed because of an ephemeral/missing mount, disk capacity, permissions, WAL sidecars, corruption, or another filesystem issue. The effective Render environment and any SQLite data must be inspected before choosing a migration or backup procedure.
- **Checks and resolution:**
  1. Confirm `https://algo-code-latest.vercel.app/api/health/live` returns `status: "ok"`; this verifies the Vercel-to-Render backend route, not the user's login session.
  2. Inspect the effective Render environment (redacting values in logs/screenshots): `DATABASE_PROVIDER`, whether `DATABASE_URL` is set and its scheme, `FORCE_SQLITE`, `DB_PATH`, `APP_ENV`, and `FLASK_ENV`. Do not print the connection string.
  3. Confirm the live database engine at `https://algo-code-latest.onrender.com/health/ready` and `https://algo-code-latest.onrender.com/health/live`. After this code revision is deployed, readiness includes `database_engine` and pool information, and startup rejects production SQLite or `FORCE_SQLITE=true`.
  4. Confirm whether a Render PostgreSQL resource is already attached and whether it contains existing data. Back up the existing SQLite file and any existing PostgreSQL target before migration. Do not switch to an empty database or migrate into a populated one without reviewing conflicts and verifying row counts.
  5. Set Render `DATABASE_URL` to the intended PostgreSQL internal connection string, `DATABASE_PROVIDER=postgresql`, and `FORCE_SQLITE=false`. Keep the URL in Render's secret environment settings. The repository's `render.yaml` declares these names but does not create or prove the existence of a database.
  6. Configure `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and an explicitly set `AUTH_EMAIL_FROM` sender verified by Resend. Production email will fail closed if these are missing; the console/outbox provider and response-body development OTPs are disabled in production.
  7. Set `AUTH_ADMIN_EMAIL` or `AUTH_BOOTSTRAP_EMAIL` to the intended login mailbox. Set `AUTH_BOOTSTRAP_PASSWORD` only if the initial administrator must be created; production bootstrap now refuses creation without an explicit password and mailbox. Existing administrator passwords are preserved unless `AUTH_BOOTSTRAP_FORCE_PASSWORD_RESET=true` is deliberately enabled.
  8. In Vercel, set server-only `BACKEND_INTERNAL_URL=https://algo-code-latest.onrender.com` (or the supported `BACKEND_API_URL` fallback) for the relevant environment. Auth uses same-origin `/api/auth/*` proxies; do not expose backend secrets via `NEXT_PUBLIC_*` variables or set an `.onrender.com` cookie domain.
  9. Redeploy only after reviewing the target database and data plan. Verify both Render and Vercel health routes report the backend as ready and PostgreSQL as active, then complete the UI end-to-end OTP check below.

### Incident 5: Backend Health Checks and OTP Requests Time Out
- **Symptom:** Vercel reports 503 for `/api/health/live` and 504 for OTP send/resend requests.
- **Interpretation:** OTP requests need database access (and email delivery); a timeout is not evidence that the OTP was sent. A subsequent verification 400 can occur if no active challenge was created or the challenge expired. Check the OTP response's `error_code` and matching Render logs.
- **Liveness behavior:** `/health/live` is a process liveness probe and returns 200 while the backend process can respond, even if its database is unhealthy. Database state remains in the response for diagnosis. Use `/health/ready` to determine whether required dependencies, including PostgreSQL, are usable. This prevents a database outage from being misclassified as a dead process by Render's `healthCheckPath`.
- **Database recovery:** A repository log dated September 16, 2026 records Neon rejecting PostgreSQL connections because the project's data-transfer quota was exceeded. This is historical evidence, not proof of the current incident. Check the active Neon project's current quota, billing, and connection status; restore/raise the quota or move to a verified database with a backup and migration plan. Do not work around database failure by switching production to SQLite or an empty database.
- **After recovery:** Confirm the backend `/health/ready` reports PostgreSQL healthy, then confirm `/api/health/live` through both Render and Vercel. Request a fresh OTP once; verify it using the new `challenge_id` returned by that successful request.

### Safe SQLite-to-PostgreSQL cutover
1. Identify the actual SQLite file from the effective `DB_PATH` (default: `data/trading_bot.db`) and confirm whether that filesystem survives service restarts. Do not assume a Render disk is attached.
2. Stop writes or schedule a maintenance window. Use SQLite's online backup API against the actual file, store the backup outside the Render service filesystem, and verify the backup with `PRAGMA integrity_check`.
3. Take a provider-side snapshot of any existing PostgreSQL target. Prefer a new/empty target only after confirming SQLite contains all existing user, session, trading, audit, and configuration data that must be retained.
4. Review `scripts/migrate_sqlite_to_postgres.py`: `--dry-run` without a PostgreSQL URL only checks SQLite integrity and lists tables; with a URL it connects but does not write. It is not a full PostgreSQL schema-compatibility test. `--verify-only` compares source/target counts and selected aggregates. Migration inserts use `ON CONFLICT DO NOTHING`, so conflicting target rows are not updated. Run against a disposable clone first and inspect every discrepancy; do not put `--pg-url` credentials in shell history or logs.
5. Perform the approved migration, run `--verify-only`, compare source and destination table counts, explicitly verify the administrator account and representative trading/configuration rows, then point Render at PostgreSQL and confirm readiness. Keep the SQLite backup and PostgreSQL snapshot until the new deployment has been validated and the rollback window has passed.

### End-to-end authentication verification
1. Open `https://algo-code-latest.vercel.app` and log in with an existing account's credentials.
2. Confirm the response is an OTP challenge and that the message reaches the account's registered mailbox. Production responses must not include `dev_otp`.
3. Enter the emailed code once; confirm the UI becomes authenticated and the dashboard loads protected data.
4. Attempt to reuse the code and confirm verification is rejected. Confirm a newly requested code expires after its configured window.
5. While signed out, `GET /api/auth/me` should return `200` with `authenticated: false`; protected API `401` responses are expected until a session is established.

### Incident 5: Global Trading Kill Switch Activation
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
