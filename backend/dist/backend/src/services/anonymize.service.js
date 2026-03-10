"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnonymizeConfig = getAnonymizeConfig;
exports.updateAnonymizeConfig = updateAnonymizeConfig;
exports.downloadNamesFile = downloadNamesFile;
exports.uploadNamesFile = uploadNamesFile;
const database_service_1 = require("./database.service");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const axios_1 = __importDefault(require("axios"));
const ANONYMIZE_CONFIG_COLLECTION = "AnonymizeConfig";
const CONFIG_DOC_ID = "global";
const PYBACKEND_URL = process.env.PYBACKEND_URL || "http://localhost:8000";
const PROJECT_ROOT = path_1.default.resolve(__dirname, "../../../");
const NAMES_FILE_PATH = path_1.default.join(PROJECT_ROOT, "shared_uploads", "anonymize", "names.csv");
/**
 * Fetches the default anonymization config from pybackend (parsed from config.yaml)
 */
async function fetchDefaultConfig() {
    try {
        const response = await axios_1.default.get(`${PYBACKEND_URL}/anonymize/defaults`);
        if (response.data?.success && response.data?.defaults) {
            return {
                ...response.data.defaults,
                updatedAt: new Date().toISOString()
            };
        }
    }
    catch (error) {
        console.error("Failed to fetch defaults from pybackend:", error);
    }
    // Fallback defaults if pybackend is unavailable
    return {
        ageEnabled: true,
        emailEnabled: true,
        phoneEnabled: true,
        pronounEnabled: false,
        phrases: [],
        skipWords: [],
        updatedAt: new Date().toISOString()
    };
}
/**
 * Retrieves the global anonymization config from DB (or defaults from pybackend)
 */
async function getAnonymizeConfig(req, res) {
    try {
        const userID = req.user?.userId;
        if (!userID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - user not authenticated"
            });
        }
        const collection = (0, database_service_1.getCollection)(ANONYMIZE_CONFIG_COLLECTION);
        let config = await collection.findOne({ _id: CONFIG_DOC_ID });
        if (!config) {
            // Return default config from pybackend if none exists
            const defaults = await fetchDefaultConfig();
            config = { _id: CONFIG_DOC_ID, ...defaults };
        }
        return res.status(200).json({
            success: true,
            config
        });
    }
    catch (error) {
        console.error("Error retrieving anonymize config:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve config"
        });
    }
}
/**
 * Updates the global anonymization config
 */
async function updateAnonymizeConfig(req, res) {
    try {
        const userID = req.user?.userId;
        if (!userID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - user not authenticated"
            });
        }
        const updates = req.body;
        const collection = (0, database_service_1.getCollection)(ANONYMIZE_CONFIG_COLLECTION);
        // Get existing config or defaults from pybackend
        let existing = await collection.findOne({ _id: CONFIG_DOC_ID });
        const baseConfig = existing || { _id: CONFIG_DOC_ID, ...(await fetchDefaultConfig()) };
        // Merge updates
        const updatedConfig = {
            ...baseConfig,
            ageEnabled: updates.ageEnabled ?? baseConfig.ageEnabled,
            emailEnabled: updates.emailEnabled ?? baseConfig.emailEnabled,
            phoneEnabled: updates.phoneEnabled ?? baseConfig.phoneEnabled,
            pronounEnabled: updates.pronounEnabled ?? baseConfig.pronounEnabled,
            phrases: updates.phrases ?? baseConfig.phrases,
            skipWords: updates.skipWords ?? baseConfig.skipWords,
            updatedAt: new Date().toISOString()
        };
        // Upsert the config
        await collection.updateOne({ _id: CONFIG_DOC_ID }, { $set: updatedConfig }, { upsert: true });
        return res.status(200).json({
            success: true,
            config: updatedConfig,
            message: "Configuration updated successfully"
        });
    }
    catch (error) {
        console.error("Error updating anonymize config:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update config"
        });
    }
}
/**
 * Downloads the current names.csv file
 */
async function downloadNamesFile(req, res) {
    try {
        const userID = req.user?.userId;
        if (!userID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - user not authenticated"
            });
        }
        if (!(0, fs_1.existsSync)(NAMES_FILE_PATH)) {
            return res.status(404).json({
                success: false,
                message: "Names file not found"
            });
        }
        const collection = (0, database_service_1.getCollection)(ANONYMIZE_CONFIG_COLLECTION);
        const config = await collection.findOne({ _id: CONFIG_DOC_ID });
        const requestedName = config?.namesFileName || "names.csv";
        const safeName = path_1.default.basename(requestedName);
        res.setHeader("X-Filename", safeName);
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, X-Filename");
        res.download(NAMES_FILE_PATH, safeName);
    }
    catch (error) {
        console.error("Error downloading names file:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to download file"
        });
    }
}
/**
 * Uploads and replaces the names.csv file
 */
async function uploadNamesFile(req, res) {
    try {
        const userID = req.user?.userId;
        if (!userID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - user not authenticated"
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file provided"
            });
        }
        // Ensure directory exists
        const dirPath = path_1.default.dirname(NAMES_FILE_PATH);
        if (!(0, fs_1.existsSync)(dirPath)) {
            await promises_1.default.mkdir(dirPath, { recursive: true });
        }
        // Write the uploaded file to names.csv location
        await promises_1.default.writeFile(NAMES_FILE_PATH, req.file.buffer, "utf-8");
        const collection = (0, database_service_1.getCollection)(ANONYMIZE_CONFIG_COLLECTION);
        await collection.updateOne({ _id: CONFIG_DOC_ID }, {
            $set: {
                namesFileName: req.file.originalname,
                updatedAt: new Date().toISOString()
            }
        }, { upsert: true });
        return res.status(200).json({
            success: true,
            message: "Names file uploaded successfully"
        });
    }
    catch (error) {
        console.error("Error uploading names file:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to upload file"
        });
    }
}
