# Deploying CodeArena (Render + Vercel)

This is the click-through sequence to get the live `code-arena-wine.vercel.app`
working with the new Phase 1 + 2 + 3 code.

**TL;DR:** deploy the backend on Render first to get a URL, then point Vercel at
that URL via env vars and let it rebuild.

---

## Step 1 — Deploy the backend on Render

### 1.1 Create the Blueprint
1. Open [render.com](https://render.com) → sign in with GitHub.
2. Top right → **New** → **Blueprint**.
3. Pick the repo `sam170203/CodeArena-2026`.
4. Render reads `render.yaml` and shows a plan: **1 Web Service** (`codearena-backend`) + **1 Postgres database** (`codearena-db`). Click **Apply**.

That starts provisioning. Expect ~3–5 minutes for the first build (it installs
`psycopg2-binary` which compiles native code).

### 1.2 Wait for the first deploy
- Web service tab → **Logs** should end with `Uvicorn running on http://0.0.0.0:10000`.
- Copy the URL Render assigned, e.g. `https://codearena-backend.onrender.com`.

### 1.3 Sanity-check the backend
```bash
curl https://codearena-backend.onrender.com/health
# → {"status":"ok"}

curl https://codearena-backend.onrender.com/lobby/active-duels
# → []
```

If those work, the backend is live.

---

## Step 2 — Point the frontend at the backend (Vercel env vars)

### 2.1 Set the env vars on Vercel
1. [Vercel dashboard](https://vercel.com) → the `code-arena-wine` project.
2. **Settings** → **Environment Variables**.
3. Add both (for **Production**, **Preview**, **Development**):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://codearena-backend.onrender.com` |
| `NEXT_PUBLIC_WS_BASE_URL` | `wss://codearena-backend.onrender.com` |

The `wss://` prefix is critical — `ws://` (insecure) won't work from an
HTTPS page.

### 2.2 Trigger a rebuild
- **Deployments** tab → click the most-recent deploy → **⋯** menu → **Redeploy**.
- Or push any commit to `feat/db-layer` and Vercel auto-rebuilds.

### 2.3 Verify
Once the redeploy finishes (~2 min):
```bash
curl -s https://code-arena-wine.vercel.app/play/friend
# → 200, not 404
```

Open the site → register a test account → it should land you on `/play`.

---

## Step 3 — Close the CORS loop on the backend

The backend by default already allows `https://code-arena-wine.vercel.app`
(it's hard-coded in `app/main.py`'s defaults). If you change the Vercel
domain or add custom domains, set this env var on the Render service:

| Render env var | Example value |
|---|---|
| `FRONTEND_URL` | `https://code-arena-wine.vercel.app` |
| `CORS_ORIGINS` | `https://your-custom-domain.com,https://staging.example.com` |

`FRONTEND_URL` is a single primary URL; `CORS_ORIGINS` is comma-separated for
adding extras. Both are merged with the hard-coded defaults. All
`*.vercel.app` subdomains are allowed via regex so preview deploys work
automatically.

After setting env vars on Render, hit **Manual Deploy** → **Deploy latest
commit** to pick them up.

---

## Common gotchas

### "Registration spins forever" / network error in browser console
The frontend is still calling `http://localhost:8000`. Either env vars weren't
set on Vercel, or Vercel wasn't redeployed after setting them. Re-check
Step 2.1 and 2.2.

### CORS error in browser console
`Access-Control-Allow-Origin` mismatch. Check Step 3 — set `FRONTEND_URL` on
Render, then redeploy the backend.

### Database errors on first request
Render's free Postgres takes ~30s to wake on first connection.
`SQLAlchemy.OperationalError` on cold-start is normal; retry after the
service warms up.

### Render free tier sleeps after 15 min idle
First request after sleep takes ~30s. The matchmaker + CF poller workers
restart on wake. There's no cost to upgrade if you want it always-on.

### Phase 3 features missing on the deployed site
Confirm Vercel rebuilt from the latest `feat/db-layer` commit. Visit
`https://code-arena-wine.vercel.app/play/friend` — should be 200, not 404.

---

## Migrating from SQLite → Postgres

The DB layer (`app/db.py`) already switches on `DATABASE_URL`:
- No env var → SQLite at `./codearena.db` (used locally and in tests)
- `DATABASE_URL` set (Render injects this) → Postgres

`Base.metadata.create_all()` runs at app startup on either DB. Quest seeds
are idempotent and re-insert on each boot.

If you ever need to wipe Postgres: Render dashboard → the DB → **Reset**.
Backend redeploys with a fresh schema.

---

## Local dev (unchanged)

```bash
# Terminal 1
cd backend
rm -f codearena.db                # only if columns changed
python3 -m uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend
cp .env.example .env.local        # first time only
npm run dev
# http://localhost:3000
```

---

## What this gets you

- **Backend** auto-deploys from `feat/db-layer` to Render, with Postgres
- **Frontend** auto-deploys from `feat/db-layer` to Vercel, baked with the
  Render backend URL
- Every push to `feat/db-layer` rebuilds both
- Preview deploys (PRs into `feat/db-layer`) get their own Vercel subdomain;
  CORS regex already permits them
