"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBundle = exports.uploadCSV = void 0;
exports.ensureUploadsDir = ensureUploadsDir;
exports.ensureValDatasetsDir = ensureValDatasetsDir;
exports.ensureRestDatasetsDir = ensureRestDatasetsDir;
exports.generateUploadFilename = generateUploadFilename;
exports.fileExists = fileExists;
exports.getUploadsPath = getUploadsPath;
exports.getValDatasetPath = getValDatasetPath;
exports.getRestDatasetPath = getRestDatasetPath;
exports.anonymizeAndSaveCsv = anonymizeAndSaveCsv;
exports.valFileExists = valFileExists;
exports.restFileExists = restFileExists;
exports.guideFileExists = guideFileExists;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const PROJECT_ROOT = path_1.default.resolve(__dirname, "../../../");
const UPLOADS_DIR = path_1.default.join(PROJECT_ROOT, "shared_uploads");
const VAL_DATASETS_DIR = path_1.default.join(PROJECT_ROOT, "val_datasets");
const REST_DATASETS_DIR = path_1.default.join(PROJECT_ROOT, "rest_datasets");
const GUIDE_DATASETS_DIR = path_1.default.join(PROJECT_ROOT, "guide_datasets");
/**
 * Ensures uploads directory exists
 */
function ensureUploadsDir() {
    try {
        if (!fs_1.default.existsSync(UPLOADS_DIR)) {
            console.log(`[fileUpload] Creating directory: ${UPLOADS_DIR}`);
            fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
    }
    catch (error) {
        console.error(`[fileUpload] Failed to ensure uploads directory (${UPLOADS_DIR}):`, error);
        throw error;
    }
}
function ensureValDatasetsDir() {
    try {
        if (!fs_1.default.existsSync(VAL_DATASETS_DIR)) {
            console.log(`[fileUpload] Creating directory: ${VAL_DATASETS_DIR}`);
            fs_1.default.mkdirSync(VAL_DATASETS_DIR, { recursive: true });
        }
    }
    catch (error) {
        console.error(`[fileUpload] Failed to ensure val datasets directory (${VAL_DATASETS_DIR}):`, error);
        throw error;
    }
}
function ensureRestDatasetsDir() {
    try {
        if (!fs_1.default.existsSync(REST_DATASETS_DIR)) {
            console.log(`[fileUpload] Creating directory: ${REST_DATASETS_DIR}`);
            fs_1.default.mkdirSync(REST_DATASETS_DIR, { recursive: true });
        }
    }
    catch (error) {
        console.error(`[fileUpload] Failed to ensure rest datasets directory (${REST_DATASETS_DIR}):`, error);
        throw error;
    }
}
/**
 * Custom storage engine for multer
 * Generates filename with timestamp: originalname_YYYY-MM-DD_HHMMSS.csv
 */
function generateUploadFilename(originalname) {
    try {
        const now = new Date();
        const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
        const time = now.toTimeString().split(" ")[0].replace(/:/g, ""); // HHmmss
        const basename = path_1.default.parse(originalname).name;
        const extension = path_1.default.parse(originalname).ext;
        return `${basename}_${date}_${time}${extension}`;
    }
    catch (error) {
        console.error(`[fileUpload] Failed to generate filename for: ${originalname}`, error);
        throw error;
    }
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        ensureUploadsDir();
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
        cb(null, generateUploadFilename(file.originalname));
    },
});
//File filter to only accept CSV files
const fileFilter = (_req, file, cb) => {
    const allowedMimes = ["text/csv", "application/vnd.ms-excel"];
    const allowedExtensions = [".csv"];
    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) ||
        allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    }
    else {
        cb(new Error("Only CSV files are allowed"));
    }
};
const bundleFileFilter = (_req, file, cb) => {
    const allowedMimes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/json",
        "text/json",
    ];
    const allowedExtensions = [".csv", ".json"];
    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) ||
        allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    }
    else {
        cb(new Error("Only CSV and JSON files are allowed"));
    }
};
/**
 * Multer upload middleware configured for single CSV file
 * Max file size: 100MB
 */
exports.uploadCSV = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(), // keep bytes in req.file.buffer so we can pass the file data to pybackend
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
    },
});
exports.uploadBundle = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter: bundleFileFilter,
    limits: {
        fileSize: 1000 * 2048 * 2048,
    },
});
/**
 * Checks if an uploaded file exists
 */
function fileExists(filename) {
    const uploadPath = path_1.default.join(UPLOADS_DIR, filename);
    if (fs_1.default.existsSync(uploadPath)) {
        return {
            exists: true,
            path: uploadPath,
        };
    }
    const restPath = path_1.default.join(REST_DATASETS_DIR, filename);
    return {
        exists: fs_1.default.existsSync(restPath),
        path: restPath,
    };
}
function getUploadsPath(filename) {
    return path_1.default.join(UPLOADS_DIR, filename);
}
function getValDatasetPath(filename) {
    return path_1.default.join(VAL_DATASETS_DIR, filename);
}
function getRestDatasetPath(filename) {
    return path_1.default.join(REST_DATASETS_DIR, filename);
}
const DEFAULT_PYBACKEND_URL = "http://localhost:8000";
/**
 * Sends CSV to pybackend for anonymization with optional config overrides
 */
async function anonymizeCsvBuffer(csvBuffer, originalFilename, configOverrides) {
    const pyBackendUrl = process.env.PYBACKEND_URL ||
        process.env.ML_API_URL ||
        DEFAULT_PYBACKEND_URL;
    const anonymizeUrl = `${pyBackendUrl}/anonymize/csv`;
    const formData = new form_data_1.default();
    formData.append("file", csvBuffer, {
        filename: originalFilename,
        contentType: "text/csv",
    });
    if (configOverrides) {
        formData.append("config", JSON.stringify(configOverrides));
    }
    const response = await axios_1.default.post(anonymizeUrl, formData, {
        headers: formData.getHeaders(),
        responseType: "text",
    });
    return response.data;
}
/**
 * Anonymizes CSV via pybackend and saves to shared_uploads
 */
async function anonymizeAndSaveCsv(file, configOverrides) {
    const anonymizedCsv = await anonymizeCsvBuffer(file.buffer, file.originalname, configOverrides);
    ensureUploadsDir();
    const filename = generateUploadFilename(file.originalname);
    const outputPath = getUploadsPath(filename);
    await fs_1.default.promises.writeFile(outputPath, anonymizedCsv, "utf-8");
    if (!fileExists(filename).exists) {
        throw new Error("File was anonymized but was not saved, internal server error");
    }
    return filename;
}
function valFileExists(filename) {
    const filepath = path_1.default.join(VAL_DATASETS_DIR, filename);
    return {
        exists: fs_1.default.existsSync(filepath),
        path: filepath,
    };
}
function restFileExists(filename) {
    const filepath = path_1.default.join(REST_DATASETS_DIR, filename);
    return {
        exists: fs_1.default.existsSync(filepath),
        path: filepath,
    };
}
function guideFileExists(filename) {
    const filepath = path_1.default.join(GUIDE_DATASETS_DIR, filename);
    return {
        exists: fs_1.default.existsSync(filepath),
        path: filepath,
    };
}
