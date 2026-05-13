# annotation_tool


# Quick Start

```
pybackend/
    python main.py
frontend/
    npm run dev
backend/
    npm run dev
```

# Runtime Modes

## Backend sampling mode

Create `backend/.env` (copy from `backend/.env.example`) and set:

```bash
APP_MODE=UI_DEV
```

When `APP_MODE=UI_DEV`:
- Representative sampling is skipped (the uploaded unlabeled dataset is used directly).
- Coverage sampling is replaced with fast random sampling.

Use `APP_MODE=DEFAULT` (or omit it) for full representative + coverage sampling.

## Pilot mode

To show a pilot banner across the live app (landing page, login, and all authenticated pages), create `frontend/.env` and set:

```bash
VITE_APP_MODE=pilot
```

The banner is not shown in the demo site regardless of this setting. Remove the variable or leave it blank to disable the banner.
