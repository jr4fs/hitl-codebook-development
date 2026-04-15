import multer, { StorageEngine, FileFilterCallback } from "multer";
import path from "path";
import { Request } from "express";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { AnonymizeConfig } from "@common/types/anonymize";
import { resolveProjectRoot } from "./projectRoot";

const PROJECT_ROOT = resolveProjectRoot();
const UPLOADS_DIR = path.join(PROJECT_ROOT, "shared_uploads");
const VAL_DATASETS_DIR = path.join(PROJECT_ROOT, "val_datasets");
const REST_DATASETS_DIR = path.join(PROJECT_ROOT, "rest_datasets");

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
export function generateUploadFilename(originalname: string): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const time = now.toTimeString().split(" ")[0].replace(/:/g, ""); // HHmmss
  const basename = path.parse(originalname).name;
  const extension = path.parse(originalname).ext;
  return `${basename}_${date}_${time}${extension}`;
}

const storage: StorageEngine = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    ensureUploadsDir();
    cb(null, UPLOADS_DIR);
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    cb(null, generateUploadFilename(file.originalname));
  },
});

//File filter to only accept CSV files
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const allowedMimes = ["text/csv", "application/vnd.ms-excel"];
  const allowedExtensions = [".csv"];

  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimes.includes(file.mimetype) ||
    allowedExtensions.includes(fileExtension)
  ) {
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
  storage: multer.memoryStorage(), // keep bytes in req.file.buffer so we can pass the file data to pybackend
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

/**
 * Checks if an uploaded file exists
 */
export function fileExists(filename: string) {
  const filepath = path.join(UPLOADS_DIR, filename);
  return {
    exists: fs.existsSync(filepath),
    path: filepath,
  };
}

export function getUploadsPath(filename: string): string {
  return path.join(UPLOADS_DIR, filename);
}

const DEFAULT_PYBACKEND_URL = "http://localhost:8000";

/**
 * Sends CSV to pybackend for anonymization with optional config overrides
 */
async function anonymizeCsvBuffer(
  csvBuffer: Buffer,
  originalFilename: string,
  configOverrides?: Partial<AnonymizeConfig>,
): Promise<string> {
  const pyBackendUrl =
    process.env.PYBACKEND_URL ||
    process.env.ML_API_URL ||
    DEFAULT_PYBACKEND_URL;
  const anonymizeUrl = `${pyBackendUrl}/anonymize/csv`;

  const formData = new FormData();
  formData.append("file", csvBuffer, {
    filename: originalFilename,
    contentType: "text/csv",
  });

  if (configOverrides) {
    formData.append("config", JSON.stringify(configOverrides));
  }

  const response = await axios.post(anonymizeUrl, formData, {
    headers: formData.getHeaders(),
    responseType: "text",
  });

  return response.data;
}

/**
 * Anonymizes CSV via pybackend and saves to shared_uploads
 */
export async function anonymizeAndSaveCsv(
  file: Express.Multer.File,
  configOverrides?: Partial<AnonymizeConfig>,
): Promise<string> {
  const anonymizedCsv = await anonymizeCsvBuffer(
    file.buffer,
    file.originalname,
    configOverrides,
  );

  ensureUploadsDir();
  const filename = generateUploadFilename(file.originalname);
  const outputPath = getUploadsPath(filename);
  await fs.promises.writeFile(outputPath, anonymizedCsv, "utf-8");

  if (!fileExists(filename).exists) {
    throw new Error(
      "File was anonymized but was not saved, internal server error",
    );
  }

  return filename;
}

export async function saveRawCsv(file: Express.Multer.File): Promise<string> {
  ensureUploadsDir();
  const filename = generateUploadFilename(file.originalname);
  const outputPath = getUploadsPath(filename);
  await fs.promises.writeFile(outputPath, file.buffer, "utf-8");

  if (!fileExists(filename).exists) {
    throw new Error(
      "File was uploaded but was not saved, internal server error",
    );
  }

  return filename;
}

export function valFileExists(filename: string) {
  const filepath = path.join(VAL_DATASETS_DIR, filename);
  return {
    exists: fs.existsSync(filepath),
    path: filepath,
  };
}

export function restFileExists(filename: string) {
  const filepath = path.join(REST_DATASETS_DIR, filename);
  return {
    exists: fs.existsSync(filepath),
    path: filepath,
  };
}
