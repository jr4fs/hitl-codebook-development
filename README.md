# Annotation Tool

## Services

- **Frontend**: React + Vite UI
- **Backend**: Node.js + Express API
- **ML backend**: FastAPI service for embeddings, inference, and rule synthesis
- **MongoDB**: persistent storage
- **Ollama**: local model server

Default ports:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- ML backend: `http://localhost:8000`
- MongoDB: `mongodb://localhost:27017`
- Ollama: `http://localhost:11434`

## Prerequisites

- Node.js 20+
- Python 3.11+
- MongoDB (local install or Docker)
- Ollama server running locally
- Models pulled in Ollama, for example:
  - `mistral:7b`

The ML backend also downloads sentence transformer models on first use.

## Setup

1. Create and activate a Python virtual environment:

- `python -m venv venv`
- `source venv/bin/activate`

2. Install dependencies for each service:

- `frontend`: `npm install`
- `backend`: `npm install`
- `pybackend`: `pip install -r requirements.txt`

3. Run the setup script:

- `python setup_repo.py`
- This initializes MongoDB collections and indexes used by the app.

## Run without Docker

1. Start MongoDB locally.
2. Start Ollama and make sure the required models are available.
3. Start the backend:
   - `cd backend`
   - Set env vars as needed, then `npm run dev`
4. Start the ML backend:
   - `cd pybackend`
   - Ensure your virtual environment is active, then `python main.py`

5. Start the frontend:
   - `cd frontend`
   - `npm run dev`

Required environment variables:

- `DB_CONN_STRING` and `DB_NAME` for MongoDB
- `JWT_SECRET` and `JWT_REFRESH_SECRET` for auth tokens

## Run with Docker

Docker runs all services except Ollama by default.

```bash
docker compose up --build
```

Notes for Docker:

- The ML backend runs on CPU when using Docker on macOS. This is slower than running it on the host with MPS. If you need faster embeddings, run the ML backend locally and point the backend to it.
- On Linux with NVIDIA GPUs, the ML backend can be configured to use the GPU with the NVIDIA container toolkit.

## Upload and output folders

These folders are used by the pipeline and are mounted in Docker.

- `shared_uploads/`
  - Raw CSV uploads
  - `shared_uploads/anonymize/names.csv` for anonymization
- `val_datasets/` and `rest_datasets/`
  - Output from the embedding and subsampling step
- `metrics/`
  - Sample, batch, and metadata CSV exports
- `generated_codebooks/`
  - Codebook and prompt exports
- `guide_datasets/`
  - Optional datasets for guidance or testing
