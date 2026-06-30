# Deployment Guide — Single VM (public, credentialed)

This deploys the whole stack on one small cloud VM with Docker Compose, behind
Caddy (auto-HTTPS), using MongoDB Atlas and OpenRouter for LLM inference. It
mirrors the original university-server setup (Node + Python share one filesystem)
so **no file-storage code changes are required**.

## Architecture

```
Browser ──HTTPS──▶ Caddy ──/api/*──▶ Node BFF ──ML──▶ Python ML service
                    │ (static SPA)        │                 │
                    └─ serves /srv        └── shared host data volume ──┘
                                          │                 │
                                    Mongo Atlas        OpenRouter API
```

- **caddy** — serves the built SPA and reverse-proxies `/api/*` to Node; terminates TLS.
- **node** — Express BFF (auth, tasks, Mongo I/O, file writes, ML proxy).
- **pybackend** — FastAPI (embeddings, FAISS sampling, anonymization, LLM calls).
- Node and Python mount the **same host data dirs** at `/app/<dir>` (see `docker-compose.yml`).

## What changed in the code for cloud

- `pybackend/models/ollama_adapter.py` — added `OpenRouterAdapter`; registry is built
  from `LLM_PROVIDER` (`openrouter` | `ollama`). Friendly model keys are unchanged.
- `frontend/src/lib/apiClient.ts` — prod builds with no `VITE_API_URL` call the API on
  the same origin (`/api/...`), so no domain is baked into the bundle.
- `backend/src/routes/accounts.ts` — `/signup` is gated behind `ALLOW_SIGNUP` (default off).
- `backend/scripts/createUser.ts` — provision accounts when signup is disabled.

---

## 1. MongoDB Atlas (free M0)

1. Create a free **M0** cluster.
2. Create a DB user (username/password).
3. Network access: allow-list the VM's static IP (added in step 3).
4. Copy the SRV connection string for `DB_CONN_STRING`.
5. After the VM is up (or from any machine with `pymongo`), create collections + indexes:
   ```bash
   MONGODB_URI="<srv-uri>" DB_NAME=annotationTool python setup_repo.py
   ```
   This creates `UserDetails` (unique `email`), `TaskDetails`, `AnnotationDetails`,
   `AnonymizeConfig` with the indexes the app expects.

## 2. OpenRouter

1. Create an account at https://openrouter.ai and generate an API key → `OPENROUTER_API_KEY`.
2. The default friendly-key → slug map is in `ollama_adapter.py`. If any model 404s,
   check https://openrouter.ai/models and override via `OPENROUTER_MODEL_MAP` (JSON) —
   no code change needed.

## 3. Provision the VM + persistent disk

Use **AWS Lightsail** (simplest, fixed price) or EC2. Recommended: **4 GB RAM minimum,
8 GB recommended** (torch + faiss + spaCy `en_core_web_lg` + Node). A 4 GB box also works
if you add swap.

1. Launch Ubuntu 22.04+, attach a **static IP**, open ports **80** and **443** only.
2. Attach/format a persistent disk and mount it at `/mnt/appdata` (the `DATA_DIR`).
   Instance SSD also persists across reboots; a separate block volume is easier to snapshot.
   ```bash
   sudo mkdir -p /mnt/appdata/{shared_uploads,val_datasets,rest_datasets,guide_datasets,generated_codebooks,metrics}
   ```
3. **Enable automated snapshots** of the disk (Lightsail/EBS) — this is the durability
   guarantee for uploads + intermediate files.
4. Install Docker + Compose plugin:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
5. Point your domain's A record at the static IP.

## 4. Configure and launch

```bash
git clone <repo> && cd annotation_tool
git checkout deploy-single-vm
cp deploy/.env.example .env
# edit .env: DOMAIN, ACME_EMAIL, DB_CONN_STRING, JWT secrets, OPENROUTER_API_KEY, DATA_DIR
docker compose up -d --build
```

Caddy will obtain a TLS cert automatically once `DOMAIN` resolves to the VM.

## 5. Create accounts (signup is disabled)

```bash
docker compose exec node npx tsx scripts/createUser.ts alice alice@example.org 'S3cret!pw'
```

Repeat per user. To temporarily allow open registration instead, set `ALLOW_SIGNUP=true`
in `.env` and `docker compose up -d` to recreate the node container.

---

## Verification

1. **Health:** `curl https://<domain>/health` → `{"status":"ok"}`.
2. **App loads:** open `https://<domain>`, log in with a provisioned account.
3. **End-to-end:** upload the sample bundle in `temp_a/` (`data - d_val.csv`,
   `task (4).json`, `labels (4).json`) → sampling runs → open `/auto-annotate/:taskId`
   → run inference (hits OpenRouter) → save/export codebook.
4. **Shared FS:** confirm a file written by Node into `shared_uploads/` is read by the
   Python coverage step (it writes `guide_datasets/<file>`):
   `ls /mnt/appdata/shared_uploads /mnt/appdata/guide_datasets`.
5. **Durability:** `sudo reboot`; after boot, `docker compose ps` shows services back up
   (restart policy) and prior uploads + Atlas data persist.

## Local smoke test (no domain)

```bash
cp deploy/.env.example .env
# set DOMAIN=localhost, ACME_EMAIL=internal, DATA_DIR=./data, real Atlas + OpenRouter creds
docker compose up --build
# browse https://localhost (accept the self-signed cert)
```

## Operations

- **Logs:** `docker compose logs -f node pybackend caddy`
- **Update:** `git pull && docker compose up -d --build`
- **Backups:** rely on disk snapshots (files) + Atlas backups (DB).
- **Costs:** VM ~$15–40/mo, Atlas M0 free, OpenRouter pay-per-token. No GPU.

## Phase 2 (deferred, not required to ship)

- Move embeddings to an API (Bedrock Titan / OpenAI / Cohere) to drop torch/faiss and
  shrink the Python image.
- Migrate data dirs to S3 (storage abstraction in `fileUpload.ts` +
  `data_manager_service.py`) — only needed if services are split across hosts.
- CI/CD auto-deploy; horizontal scaling.
