import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  generateSampleMetrics,
  generateMetadataMetrics,
  generateBatchMetrics,
  downloadMetricsFile,
} from "../services/metrics.service";

const router = Router();

router.use(authenticateToken);

router.post("/samples", generateSampleMetrics);
router.post("/metadata", generateMetadataMetrics);
router.post("/batches", generateBatchMetrics);
router.get("/download/:filename", downloadMetricsFile);

export default router;
