import { Router } from "express";
import {
  getAnonymizeConfig,
  updateAnonymizeConfig,
  downloadNamesFile,
  uploadNamesFile
} from "../services/anonymize.service";
import { uploadCSV } from "../utils/fileUpload";
import { authenticateToken } from "../middleware/auth.middleware";
import multer from "multer";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// CSV file upload middleware (memory storage for names file)
const uploadCSVMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["text/csv", "application/vnd.ms-excel"];
    const ext = file.originalname.toLowerCase().endsWith(".csv");
    if (allowedMimes.includes(file.mimetype) || ext) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB for names file
  }
});

// Get current anonymization config
router.get("/config", getAnonymizeConfig);

// Update anonymization config
router.put("/config", updateAnonymizeConfig);

// Download names.csv file
router.get("/names", downloadNamesFile);

// Upload new names.csv file
router.post("/names", uploadCSVMemory.single("file"), uploadNamesFile);

export default router;
