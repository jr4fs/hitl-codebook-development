"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const anonymize_service_1 = require("../services/anonymize.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// CSV file upload middleware (memory storage for names file)
const uploadCSVMemory = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter: (_req, file, cb) => {
        const allowedMimes = ["text/csv", "application/vnd.ms-excel"];
        const ext = file.originalname.toLowerCase().endsWith(".csv");
        if (allowedMimes.includes(file.mimetype) || ext) {
            cb(null, true);
        }
        else {
            cb(new Error("Only CSV files are allowed"));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB for names file
    }
});
// Get current anonymization config
router.get("/config", anonymize_service_1.getAnonymizeConfig);
// Update anonymization config
router.put("/config", anonymize_service_1.updateAnonymizeConfig);
// Download names.csv file
router.get("/names", anonymize_service_1.downloadNamesFile);
// Upload new names.csv file
router.post("/names", uploadCSVMemory.single("file"), anonymize_service_1.uploadNamesFile);
exports.default = router;
