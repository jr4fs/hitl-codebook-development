# AWS Deployment — EC2 single VM (OpenRouter + OpenAI embeddings)

Tailored walkthrough for deploying on **AWS EC2** with a **sslip.io** hostname (free
auto-HTTPS) and a **GitHub deploy key**. LLM inference goes to **OpenRouter**; text
embeddings go to the **OpenAI API** (`EMBEDDINGS_PROVIDER=openai`), so the box stays
light. Bedrock and fully-local modes are covered at the end.

See `DEPLOY.md` for the architecture overview; this doc is the concrete AWS runbook.

## Prerequisites (have these ready)
- **MongoDB Atlas** M0 cluster + DB user + SRV connection string (`DEPLOY.md` §1).
- **OpenRouter** API key.
- **OpenAI** API key (embeddings only; cheap — ~$0.02 / 1M tokens).

---

## 1. Launch the EC2 instance (console)
- **AMI:** Ubuntu Server 24.04 LTS (x86_64).
- **Instance type:** `t3.medium` (4 GB / 2 vCPU). Headroom to build the torch image
  and to try local mode later; downsize to `t3.small` once purely on APIs.
- **Key pair:** create/download one for SSH.
- **Storage:** 30 GB **gp3** root volume.
- **Security group** — inbound rules:
  | Type | Port | Source | Why |
  |------|------|--------|-----|
  | SSH | 22 | **My IP** | admin access |
  | HTTP | 80 | 0.0.0.0/0 | Let's Encrypt HTTP-01 challenge + redirect |
  | HTTPS | 443 | 0.0.0.0/0 | the app |

## 2. Elastic IP
- Allocate an **Elastic IP** and **associate** it with the instance (so the public IP
  is stable across restarts). Note it — call it `EIP`, e.g. `203.0.113.25`.
- Your public hostname is then: **`annotate.<EIP>.sslip.io`**
  (e.g. `annotate.203.0.113.25.sslip.io`). sslip.io resolves it to `EIP`
  automatically — no DNS setup, and Let's Encrypt issues a real cert for it.

## 3. Bootstrap the instance
The bootstrap installs Docker + Compose, adds 4 GB swap, creates the persistent data
dirs, and generates a GitHub deploy key. Since the repo is **private** (you can't clone
until the deploy key exists), copy the script up **from your laptop** first:

```bash
# from your local repo checkout:
scp -i <your-key>.pem deploy/aws-bootstrap.sh ubuntu@<EIP>:~
ssh -i <your-key>.pem ubuntu@<EIP>
bash aws-bootstrap.sh
```

The script prints a **public deploy key**. In GitHub → repo **Settings → Deploy keys →
Add deploy key**, paste it, leave **write access off**. Then re-login (or `newgrp
docker`) so Docker works without sudo.

## 4. Clone + configure
```bash
git clone git@github.com:chandan-m/annotation_tool.git
cd annotation_tool && git checkout deploy-single-vm
cp deploy/.env.example .env
nano .env
```

Set these in `.env` (replace the bracketed values):

```ini
# --- Public hostname / TLS ---
DOMAIN=annotate.<EIP>.sslip.io
ACME_EMAIL=chandanmanjunath24@gmail.com

# --- Persistent data root (created by bootstrap) ---
DATA_DIR=/mnt/appdata

# --- MongoDB Atlas ---
DB_CONN_STRING=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=annotationTool

# --- Auth: generate each with `openssl rand -hex 32` ---
JWT_SECRET=<random-hex-32>
JWT_REFRESH_SECRET=<different-random-hex-32>
ALLOW_SIGNUP=false

# --- LLM inference: OpenRouter ---
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_SITE_URL=https://annotate.<EIP>.sslip.io

# --- Embeddings: OpenAI API (keeps the VM light) ---
EMBEDDINGS_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# --- Sampling ---
APP_MODE=DEFAULT
MAX_CONCURRENT_SAMPLING=1
```

Generate the JWT secrets quickly:
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"; echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
```

## 5. Atlas network access
In Atlas → **Network Access**, allow-list the **Elastic IP** (`EIP/32`). Then create the
collections + indexes (recommended, for the unique-email index):
```bash
docker run --rm -v "$PWD":/repo -w /repo \
  -e MONGODB_URI="$(grep ^DB_CONN_STRING .env | cut -d= -f2-)" \
  -e DB_NAME="$(grep ^DB_NAME .env | cut -d= -f2-)" \
  python:3.11-slim bash -c "pip install -q pymongo && python setup_repo.py"
```

## 6. Build + launch
```bash
docker compose up -d --build      # first build ~10-15 min (installs torch, builds SPA)
docker compose logs -f caddy      # watch for the Let's Encrypt cert being issued
```

Caddy obtains the TLS cert automatically once port 80 is reachable (it is, via the
security group). When the cert lands, the app is live at `https://annotate.<EIP>.sslip.io`.

## 7. Create user accounts (signup is disabled)
```bash
docker compose exec node npx tsx scripts/createUser.ts alice alice@example.org 'S3cret!pw'
```
Repeat per reviewer.

---

## Verify
1. `curl https://annotate.<EIP>.sslip.io/health` → `{"status":"ok"}`.
2. Open the URL, log in with a created account.
3. Upload the `temp_a/` bundle → sampling runs (watch `docker compose logs -f pybackend`
   for `Using 'openai' API embeddings` and `Embedding N texts with openai API`) → open
   `/auto-annotate/:taskId` → run inference (hits OpenRouter) → export codebook.
4. `ls /mnt/appdata/shared_uploads /mnt/appdata/guide_datasets` — files persist on disk.

## Operations
- **Update:** `git pull && docker compose up -d --build`
- **Logs:** `docker compose logs -f node pybackend caddy`
- **Durability:** enable **EBS snapshots** of the root volume (AWS Backup or a snapshot
  schedule). Uploads live under `/mnt/appdata`; DB is in Atlas (own backups).
- **Cost:** t3.medium ~$30/mo + EBS ~$3/mo, covered by the $200 credits for months.
  OpenRouter + OpenAI are pay-per-use (embeddings are pennies).

---

## Later: switch inference + embeddings to AWS Bedrock
Because this is EC2, use an **IAM instance role** — no static AWS keys in `.env`.
1. IAM → create a role for **EC2** with a policy allowing `bedrock:InvokeModel` (scope to
   the embedding/inference model ARNs). Attach it to the instance (Actions → Security →
   Modify IAM role).
2. In Bedrock console, request access to the models you want (e.g. Titan Embeddings v2,
   and a chat model for inference).
3. Edit `.env`:
   ```ini
   EMBEDDINGS_PROVIDER=bedrock
   BEDROCK_EMBEDDING_MODEL=amazon.titan-embed-text-v2:0
   BEDROCK_REGION=us-east-1
   # (LLM-via-Bedrock adapter is a follow-up; keep LLM_PROVIDER=openrouter until then.)
   ```
   Leave the AWS_* key vars blank — boto3 picks up the instance role automatically.
4. `docker compose up -d` (recreates pybackend). No rebuild needed.

## Later: fully local inference + embeddings (no external APIs)
On the same 4 GB box:
```ini
EMBEDDINGS_PROVIDER=local     # loads mpnet/torch in-process (~1.5 GB RAM)
LLM_PROVIDER=ollama           # requires an Ollama server reachable from pybackend
OLLAMA_BASE_URL=http://<ollama-host>:11434
```
Local embeddings work out of the box (torch is already in the image). Local LLM needs an
Ollama server (a GPU box or a bigger instance) — `t3.medium` has no GPU, so this mode is
mainly for testing small models.
