import fs from "fs";
import path from "path";

export const METRICS_DIR = path.resolve(__dirname, "../../../metrics");

export function ensureMetricsDir(): void {
  if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
  }
}
