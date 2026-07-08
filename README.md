# Annotation Assistant

**Human-in-the-loop codebook development for LLM-assisted text annotation.**

Annotation Assistant turns the human effort in large-scale text labeling from
*annotating every example* into *teaching the model how to label*. You review a
small, representative sample of your data alongside an LLM's predictions; every
correction is distilled into an explicit, versioned **codebook** of rules that
guides the model on the rest of the corpus. The result is a validated, exportable
labeling policy — not just a labeled file — that can drive annotation at scale.

## Key features

- **Guided sampling.** Representative + coverage sampling over sentence embeddings
  selects a diverse "guide set" from a large unlabeled pool, so a small review
  budget covers the data distribution.
- **Co-annotation loop.** Review the LLM's label, key span, and reasoning per
  sample; mark correct/incorrect and add feedback. After each batch the model
  **synthesizes new rules** into a live codebook.
- **Continuous evaluation.** Track F1 on the examples reviewed so far and F1 on a
  held-out validation set; run a full evaluation any time.
- **Exportable codebook** ready to power downstream annotation, plus one-click
  inference over the entire dataset.
- **Provider-agnostic.** LLM via OpenRouter or local Ollama; embeddings via
  OpenAI, Amazon Bedrock, or in-process (mpnet) — switchable with env vars.
- **Interactive demo** at the `/demo` route (fully mocked, no backend or keys).

## How it works

1. **Upload** a labeled validation set, an unlabeled pool, and task + label
   definitions (a ready-made sample bundle is downloadable in the app, see
   [`sample_dataset/`](./sample_dataset)).
2. **Sample** a guide set within your review *budget*.
3. **Review** AI suggestions batch by batch; correct mistakes and give feedback.
4. **Synthesize** rules automatically after each batch into the live codebook.
5. **Evaluate** on the held-out set; iterate until quality is sufficient.
6. **Export** the codebook and, optionally, run inference over the full dataset.

## Architecture

```
Browser ──HTTP(S)──▶ Caddy ──/api/*──▶ Node/Express BFF ──▶ Python/FastAPI ML service
                      │ (static SPA)         │                     │
                      └─ serves the build    └── shared data ──────┘
                                             │                     │
                                         MongoDB          OpenRouter · OpenAI · Bedrock · Ollama
```

## Quickstart

| Goal | Guide |
|------|-------|
| Develop locally with hot reload | [docs/local-dev.md](./docs/local-dev.md) |
| Run the full stack in Docker | [docs/deploy-docker.md](./docs/deploy-docker.md) |
| Deploy to AWS (one script) | [docs/deploy-aws.md](./docs/deploy-aws.md) |

All services read a single repo-root `.env` (`cp .env.example .env`). The sampling
methodology is documented in [docs/sampling_methodology.md](./docs/sampling_methodology.md).

## Implementation details

- **Software stack.** React (Vite) single-page frontend, a Node/Express
  backend-for-frontend (authentication, task management, file storage, ML proxy),
  and a Python/FastAPI ML service (embeddings, sampling, anonymization, LLM calls).
  Shared TypeScript types; MongoDB for persistence.
- **Deployment (Docker + AWS).** Containerized with Docker Compose and provisioned
  on AWS with Terraform via a single idempotent `deploy.sh` (EC2 + Elastic IP,
  Caddy auto-HTTPS). The same stack runs locally with one Docker command.
- **Open-source & reproducible.** Fully open-source and reproducible from a single
  repo-root `.env` plus one-command Docker or Terraform-driven deploys; seeded
  sampling and versioned, exportable codebooks make runs repeatable.
- **Retrieval & memory.** The unlabeled pool is embedded (sentence-transformer
  mpnet or an embeddings API) and indexed in **FAISS**; representative + coverage
  sampling retrieves a diverse guide set. Synthesized rules accumulate in a
  persistent codebook that is fed back into later prompts as long-term memory.
- **Parallelization & optimizations.** Blocking LLM/embedding calls are offloaded
  from the event loop and batched under a bounded-concurrency semaphore; the
  candidate pool can be subsampled before embedding; sampling jobs are queued
  (FIFO) behind a memory guard; validation and full-dataset inference fan out
  concurrently; and large dataset uploads are gzip-compressed.
- **Data storage & APIs** — switchable via env (`LLM_PROVIDER`,
  `EMBEDDINGS_PROVIDER`, `DB_CONN_STRING`), with three target environments:
  - **Public AWS deployment** — MongoDB Atlas, OpenRouter (LLM), and OpenAI or
    Amazon Bedrock (embeddings), behind Caddy auto-HTTPS on a single EC2 VM.
  - **Hosted on CARC** — the same containers run on the CARC research-computing
    cluster for institutionally hosted compute and data.
  - **Local with Ollama** — MongoDB in a container, LLM inference via a local
    Ollama server, and embeddings computed in-process (mpnet); no external API
    keys or data egress.

## Repository layout

```
frontend/     React + Vite SPA
backend/      Node/Express BFF (auth, tasks, storage, ML proxy)
pybackend/    Python/FastAPI ML service (embeddings, sampling, LLM)
common/       Shared TypeScript types
deploy/       Terraform + Compose overlays + deploy.sh (AWS)
docs/         Setup & deployment guides
sample_dataset/  Ready-to-upload demo bundle
```