import multer, { StorageEngine, FileFilterCallback } from "multer";
import path from "path";
import { Request } from "express";
import fs from "fs";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

/**
 * Ensures uploads directory exists
 */
export function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Custom storage engine for multer
 * Generates filename with timestamp: originalname_YYYY-MM-DD_HHMMSS.csv
 */
const storage: StorageEngine = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    ensureUploadsDir();
    cb(null, UPLOADS_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const now = new Date();
    const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(" ")[0].replace(/:/g, ""); // HHmmss
    const basename = path.parse(file.originalname).name;
    const extension = path.parse(file.originalname).ext;
    
    const filename = `${basename}_${date}_${time}${extension}`;
    cb(null, filename);
  }
});


//File filter to only accept CSV files
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimes = ["text/csv", "application/vnd.ms-excel"];
  const allowedExtensions = [".csv"];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV files are allowed"));
  }
};

/**
 * Multer upload middleware configured for single CSV file
 * Max file size: 100MB
 */
export const uploadCSV = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

/**
 * Checks if an uploaded file exists
 */
export function fileExists(filename: string): boolean {
    const filepath = path.join(UPLOADS_DIR, filename);
  return fs.existsSync(filepath);
}