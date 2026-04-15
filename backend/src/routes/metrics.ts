import { Router } from "express";
import {
  generateSampleMetrics,
  generateMetadataMetrics,
  generateBatchMetrics,
  generateCodebookExport,
  downloadMetricsFile,
} from "../services/metrics.service";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.post("/samples", generateSampleMetrics);
router.post("/metadata", generateMetadataMetrics);
router.post("/batches", generateBatchMetrics);
router.post("/codebook", generateCodebookExport);
router.get("/download/:filename", downloadMetricsFile);

export default router;
