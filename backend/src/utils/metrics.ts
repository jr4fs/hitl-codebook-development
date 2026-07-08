import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../../../");
export const METRICS_DIR = path.join(PROJECT_ROOT, "metrics");

export function ensureMetricsDir(): void {
  if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
  }
}
