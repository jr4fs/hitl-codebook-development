import fs from "fs";
import path from "path";

const ROOT_MARKERS = ["backend", "frontend", "pybackend"];
let cachedRoot: string | null = null;

function isRepoRoot(candidate: string): boolean {
  return ROOT_MARKERS.every((marker) =>
    fs.existsSync(path.join(candidate, marker)),
  );
}

export function resolveProjectRoot(): string {
  if (cachedRoot) return cachedRoot;

  const candidates = [
    process.env.PROJECT_ROOT,
    path.resolve(__dirname, "../../../"),
    path.resolve(__dirname, "../../../../"),
    path.resolve(__dirname, "../../../../../"),
    process.cwd(),
    path.resolve(process.cwd(), ".."),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (isRepoRoot(candidate)) {
      cachedRoot = candidate;
      return candidate;
    }
  }

  cachedRoot = candidates[0] || path.resolve(__dirname, "../../../");
  return cachedRoot;
}
