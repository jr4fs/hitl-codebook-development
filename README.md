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

The system is a three-tier application: a **React** (Vite) single-page frontend, a
**Node/Express** backend-for-frontend for authentication, task management, and file
storage, and a **Python/FastAPI** ML service for embeddings, sampling, anonymization,
and LLM calls. The codebook is built through a retrieval-and-memory loop:
sentence-transformer (mpnet) or API embeddings index the unlabeled pool in **FAISS**,
and coverage/representative sampling selects a diverse guide set; as the user reviews
each batch, the LLM synthesizes rules that accumulate in a persistent, exported
codebook, which is fed back into later prompts as long-term memory. To stay responsive
over corpora of hundreds of thousands of rows, blocking LLM and embedding calls are
offloaded from the event loop and batched under a bounded-concurrency semaphore, the
candidate pool can be subsampled before embedding, sampling jobs are queued (FIFO)
behind a memory guard, and validation and full-dataset inference fan out concurrently.
The implementation is fully open-source and reproducible from a single `.env` plus
one-command Docker or Terraform-driven deploys.

Deployment is containerized with **Docker Compose** and provisioned on **AWS** with
**Terraform** through a single idempotent script. Data storage and model APIs are
configurable for three targets, selected purely through env switches (`LLM_PROVIDER`,
`EMBEDDINGS_PROVIDER`, `DB_CONN_STRING`): **(1) public AWS deployment** — MongoDB Atlas
for persistence, OpenRouter for LLM inference, and OpenAI (or Amazon Bedrock)
for embeddings, behind Caddy auto-HTTPS on a single EC2 VM; **(2) hosted on CARC** —
the same containers run on the CARC research-computing cluster for institutionally
hosted compute and data; and **(3) fully local with Ollama** — MongoDB in a container
with LLM inference via a local Ollama server and embeddings computed in-process, so no
external API keys or data egress are required.

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