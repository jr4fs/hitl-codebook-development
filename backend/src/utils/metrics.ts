import fs from "fs";
import path from "path";
import { resolveProjectRoot } from "./projectRoot";

const PROJECT_ROOT = resolveProjectRoot();
export const METRICS_DIR = path.resolve(PROJECT_ROOT, "metrics");
export const CODEBOOK_DIR = path.resolve(PROJECT_ROOT, "generated_codebooks");

export function ensureMetricsDir(): void {
  if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
  }
}

export function ensureCodebookDir(): void {
  if (!fs.existsSync(CODEBOOK_DIR)) {
    fs.mkdirSync(CODEBOOK_DIR, { recursive: true });
  }
}
