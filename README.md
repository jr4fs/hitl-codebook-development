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

Create a repo-level `.env` file (you can copy from `.env.example`) and set:

```bash
APP_MODE=UI_DEV
```

When `APP_MODE=UI_DEV`:
- Representative sampling is skipped (the uploaded unlabeled dataset is used directly).
- Coverage sampling is replaced with fast random sampling.

Use `APP_MODE=DEFAULT` (or unset it) for full representative + coverage sampling.
