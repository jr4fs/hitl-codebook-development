# Annotation Assistant — Frontend

React + TypeScript + Vite frontend for Annotation Assistant.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server includes a live demo at `http://localhost:5173/demo`.

## Demo — build and run locally

The demo is a self-contained static build with mocked API responses. No backend required.

**Build:**

```bash
npm install
npm run build:demo
```

Output is written to `dist-demo/`.

**Run:**

```bash
cd dist-demo
npx serve .
```

Open `http://localhost:3000` in your browser.

**Share as a zip:**

```bash
npm run build:demo
zip -r annotation-demo.zip dist-demo/
```

Recipients unzip and run `npx serve .` inside the folder.

## Production build

```bash
npm run build      # output → dist/
npm run preview    # preview the production build locally
```
