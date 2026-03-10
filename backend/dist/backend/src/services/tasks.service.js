"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTask = createTask;
exports.getUserTasks = getUserTasks;
exports.getTaskByID = getTaskByID;
exports.saveTaskCodebook = saveTaskCodebook;
exports.uploadTaskFile = uploadTaskFile;
exports.uploadTaskBundle = uploadTaskBundle;
exports.getCsvData = getCsvData;
exports.checkValFileExists = checkValFileExists;
const database_service_1 = require("./database.service");
const fileUpload_1 = require("../utils/fileUpload");
const mongodb_1 = require("mongodb");
const papaparse_1 = __importDefault(require("papaparse"));
const promises_1 = __importDefault(require("fs/promises"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const TASKS_COLLECTION = process.env.TASKS_COLLECTION_NAME || "TaskDetails";
const ANONYMIZE_CONFIG_COLLECTION = "AnonymizeConfig";
const CONFIG_DOC_ID = "global";
const ANNOTATION_COLLECTION = process.env.ANNOTATION_COLLECTION_NAME || "AnnotationDetails";
const TASK_JSON_REQUIRED_KEYS = ["taskname", "description"];
/**
 * Fetches the global anonymize config from DB (or returns null if none exists)
 */
async function getAnonymizeConfigFromDB() {
    try {
        const collection = (0, database_service_1.getCollection)(ANONYMIZE_CONFIG_COLLECTION);
        return await collection.findOne({ _id: CONFIG_DOC_ID });
    }
    catch (error) {
        console.error("Error fetching anonymize config:", error);
        return null;
    }
}
function parseCsvBuffer(buffer) {
    try {
        const csvText = buffer.toString("utf-8");
        const parseResult = papaparse_1.default.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
        });
        if (parseResult.errors.length > 0) {
            console.warn("CSV parsing warnings:", parseResult.errors);
        }
        return Array.isArray(parseResult.data) ? parseResult.data : [];
    }
    catch (error) {
        console.error("Error in parseCsvBuffer:", error);
        throw error;
    }
}
function parseTaskJson(buffer) {
    try {
        const raw = buffer.toString("utf-8");
        const taskJson = JSON.parse(raw);
        const name = taskJson.taskname || taskJson.taskName || taskJson.name || "";
        const description = taskJson.description || "";
        const type = taskJson.type === "Single-class" ? "Single-class" : "Multiclass";
        if (!name.trim() || !description.trim()) {
            throw new Error(`Task JSON must include ${TASK_JSON_REQUIRED_KEYS.join(", ")}`);
        }
        return { name: name.trim(), description: description.trim(), type };
    }
    catch (error) {
        console.error("Error in parseTaskJson:", error);
        throw error;
    }
}
function parseLabelsJson(buffer) {
    try {
        const raw = buffer.toString("utf-8");
        const labelsJson = JSON.parse(raw);
        const labels = Array.isArray(labelsJson.labels) ? labelsJson.labels : [];
        if (labels.length === 0) {
            throw new Error("Labels JSON must include a non-empty labels array");
        }
        return labels.map((label, idx) => {
            const name = label.name?.trim() || "";
            const definition = label.description?.trim() || "";
            const keywords = Array.isArray(label.keywords)
                ? label.keywords.map((kw) => kw.trim()).filter(Boolean)
                : [];
            const guidelines = Array.isArray(label.guidelines)
                ? label.guidelines
                    .map((item) => (typeof item === "string" ? item.trim() : ""))
                    .filter(Boolean)
                    .join("\n")
                : typeof label.guidelines === "string"
                    ? label.guidelines.trim()
                    : undefined;
            if (!name || !definition || keywords.length === 0) {
                throw new Error(`Label ${idx + 1} must include name, description, and keywords`);
            }
            return {
                name,
                definition,
                keywords,
                ...(guidelines ? { guidelines } : {}),
            };
        });
    }
    catch (error) {
        console.error("Error in parseLabelsJson:", error);
        throw error;
    }
}
function getRowTextValue(row) {
    const candidates = ["text", "clean_text", "raw_text"];
    for (const key of candidates) {
        const value = row[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return "";
}
function getColumnsFromRows(rows) {
    if (rows.length === 0)
        return [];
    const clean_cols = Object.keys(rows[0]).filter(key => String(key).trim() !== "");
    return clean_cols;
}
// Validates task creation request payload
function validateTaskPayload(payload) {
    const errors = [];
    if (!payload.name || payload.name.trim().length === 0) {
        errors.push("Task name is required");
    }
    if (!payload.description || payload.description.trim().length === 0) {
        errors.push("Task description is required");
    }
    if (!payload.type || !["Multiclass", "Single-class"].includes(payload.type)) {
        errors.push("Task type must be either 'Multiclass' or 'Single-class'");
    }
    if (!Array.isArray(payload.labels) || payload.labels.length === 0) {
        errors.push("At least one label is required");
    }
    else {
        payload.labels.forEach((label, idx) => {
            if (!label.name || label.name.trim().length === 0) {
                errors.push(`Label ${idx + 1}: Label name is required`);
            }
            if (!Array.isArray(label.keywords) || label.keywords.length === 0) {
                errors.push(`Label ${idx + 1}: Keywords must be an array and must contain at least one keyword`);
            }
        });
    }
    if (!payload.file || payload.file.trim().length === 0) {
        errors.push("File path is required");
    }
    else if (!(0, fileUpload_1.fileExists)(payload.file)) {
        errors.push("File does not exist or has been deleted");
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
// Creates a new task and stores it in the TaskDetails collection
async function createTask(req, res) {
    const userID = req.user?.userId;
    if (!userID) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - user not authenticated",
        });
    }
    try {
        const payload = {
            name: req.body.name,
            description: req.body.description,
            type: req.body.type,
            labels: req.body.labels,
            codebook: Array.isArray(req.body.codebook)
                ? req.body.codebook
                : undefined,
            codebookSourceTaskId: typeof req.body.codebookSourceTaskId === "string"
                ? req.body.codebookSourceTaskId
                : undefined,
            codebookSourceTaskName: typeof req.body.codebookSourceTaskName === "string"
                ? req.body.codebookSourceTaskName
                : undefined,
            file: req.body.file,
            columns: req.body.columns,
            userID: userID,
        };
        // Validate payload
        const validation = validateTaskPayload(payload);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: "Task Creation Validation failed",
                errors: {
                    payload: validation.errors,
                },
            });
        }
        const taskDetailsCollection = (0, database_service_1.getCollection)(TASKS_COLLECTION);
        const taskId = req.body.taskId?.toString().trim();
        console.log(`[createTask] userID: ${userID}, taskId in request: ${taskId}`);
        // Create task document
        const taskData = {
            name: payload.name,
            description: payload.description,
            type: payload.type,
            labels: payload.labels,
            ...(Array.isArray(payload.codebook)
                ? { codebook: payload.codebook }
                : {}),
            ...(payload.codebookSourceTaskId
                ? { codebookSourceTaskId: payload.codebookSourceTaskId }
                : {}),
            ...(payload.codebookSourceTaskName
                ? { codebookSourceTaskName: payload.codebookSourceTaskName }
                : {}),
            file: payload.file,
            columns: payload.columns,
            userID: userID,
            createdAt: req.body.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (taskId) {
            console.log(`[createTask] Attempting update for taskId: ${taskId}`);
            const updateDoc = {
                name: taskData.name,
                description: taskData.description,
                type: taskData.type,
                labels: taskData.labels,
                file: taskData.file,
                columns: taskData.columns,
                userID: taskData.userID,
                updatedAt: taskData.updatedAt,
            };
            if (Array.isArray(payload.codebook)) {
                updateDoc.codebook = payload.codebook;
            }
            if (payload.codebookSourceTaskId) {
                updateDoc.codebookSourceTaskId = payload.codebookSourceTaskId;
            }
            if (payload.codebookSourceTaskName) {
                updateDoc.codebookSourceTaskName = payload.codebookSourceTaskName;
            }
            const result = await taskDetailsCollection.updateOne({ _id: new mongodb_1.ObjectId(taskId), userID: userID }, { $set: updateDoc });
            console.log(`[createTask] Update result: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);
            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Task not found or you don't have permission to update it",
                });
            }
            return res.status(200).json({
                success: true,
                message: "Task updated successfully",
                taskId: taskId,
                task: {
                    _id: taskId,
                    ...taskData,
                },
            });
        }
        console.log(`[createTask] No taskId provided, performing insertOne`);
        const result = await taskDetailsCollection.insertOne(taskData);
        console.log(`[createTask] insertOne success: ${result.insertedId}`);
        return res.status(201).json({
            success: true,
            message: "Task created successfully",
            taskId: result.insertedId.toString(),
            task: {
                _id: result.insertedId.toString(),
                ...taskData,
            },
        });
    }
    catch (error) {
        console.error("Error creating task:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create task",
        });
    }
}
// Retrieves all tasks for a specific user
async function getUserTasks(req, res) {
    try {
        const userID = req.user?.userId;
        if (!userID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - user not authenticated",
            });
        }
        const taskDetailsCollection = (0, database_service_1.getCollection)("TaskDetails");
        const tasks = await taskDetailsCollection
            .find({ userID: userID })
            .toArray();
        return res.status(200).json({
            success: true,
            tasks,
            count: tasks.length,
        });
    }
    catch (error) {
        console.error("Error retrieving tasks:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Failed to retrieve tasks",
        });
    }
}
// Retrieves all tasks for a specific user
async function getTaskByID(req, res) {
    try {
        const userID = req.user?.userId;
        const { taskId } = req.params;
        if (!userID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - user not authenticated",
            });
        }
        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Invalid - No task ID found",
            });
        }
        const taskDetailsCollection = (0, database_service_1.getCollection)(TASKS_COLLECTION);
        const task = await taskDetailsCollection.findOne({
            _id: new mongodb_1.ObjectId(taskId),
            userID: userID,
        });
        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }
        return res.status(200).json({
            success: true,
            task,
        });
    }
    catch (error) {
        console.error("Error retrieving task:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Failed to retrieve task",
        });
    }
}
async function saveTaskCodebook(req, res) {
    try {
        const userID = req.user?.userId;
        const { taskId, codebook } = req.body;
        if (!userID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - user not authenticated",
            });
        }
        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Invalid - No task ID found",
            });
        }
        if (!Array.isArray(codebook)) {
            return res.status(400).json({
                success: false,
                message: "Invalid codebook payload",
            });
        }
        const taskDetailsCollection = (0, database_service_1.getCollection)(TASKS_COLLECTION);
        const result = await taskDetailsCollection.updateOne({ _id: new mongodb_1.ObjectId(taskId), userID: userID }, {
            $set: {
                codebook,
                updatedAt: new Date().toISOString(),
            },
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found or you don't have permission to update it",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Codebook saved",
        });
    }
    catch (error) {
        console.error("Error saving codebook:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to save codebook",
        });
    }
}
/*
 * Handles CSV file upload using multer
 * Returns the stored filename to be used in task creation
 */
async function uploadTaskFile(req, res) {
    try {
        const userID = req.user?.userId;
        if (!userID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - user not authenticated",
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file provided",
            });
        }
        (0, fileUpload_1.ensureUploadsDir)();
        const filename = (0, fileUpload_1.generateUploadFilename)(req.file.originalname);
        const outputPath = (0, fileUpload_1.getUploadsPath)(filename);
        await promises_1.default.writeFile(outputPath, req.file.buffer, "utf-8");
        return res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            filePath: filename,
        });
    }
    catch (error) {
        console.error("Error uploading file:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to upload file",
            error: error,
        });
    }
}
/*
 * Uploads D_val, D_all, task JSON, and labels JSON
 * D_all in rest_datasets, D_val in val_datasets
 * Creates the task and seeds annotations from D_val
 */
async function uploadTaskBundle(req, res) {
    const userID = req.user?.userId;
    console.log(`[uploadTaskBundle] Started by user: ${userID}`);
    if (!userID) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - user not authenticated",
        });
    }
    try {
        const files = req.files;
        const dValFile = files?.d_val?.[0];
        const dAllFile = files?.d_all?.[0];
        const taskJsonFile = files?.task_json?.[0];
        const labelsJsonFile = files?.labels_json?.[0];
        if (!dValFile || !dAllFile || !taskJsonFile || !labelsJsonFile) {
            console.error("[uploadTaskBundle] Missing files:", {
                d_val: !!dValFile,
                d_all: !!dAllFile,
                task_json: !!taskJsonFile,
                labels_json: !!labelsJsonFile,
            });
            return res.status(400).json({
                success: false,
                message: "Missing files. Expected d_val, d_all, task_json, labels_json.",
            });
        }
        // Parse Task JSON
        console.log("[uploadTaskBundle] Parsing task_json...");
        const taskInfo = parseTaskJson(taskJsonFile.buffer);
        console.log("[uploadTaskBundle] Task Info parsed:", taskInfo.name);
        // Parse Labels JSON
        console.log("[uploadTaskBundle] Parsing labels_json...");
        const labels = parseLabelsJson(labelsJsonFile.buffer);
        console.log("[uploadTaskBundle] Labels parsed, count:", labels.length);
        // Parse CSVs
        console.log("[uploadTaskBundle] Parsing CSV files...");
        const valRows = parseCsvBuffer(dValFile.buffer);
        const restRows = parseCsvBuffer(dAllFile.buffer);
        console.log(`[uploadTaskBundle] CSVs parsed. Val rows: ${valRows.length}, Rest rows: ${restRows.length}`);
        // Validate Columns
        console.log("[uploadTaskBundle] Validating columns...");
        const valColumns = getColumnsFromRows(valRows);
        const restColumns = getColumnsFromRows(restRows);
        const hasValText = valColumns.includes("translated_text");
        const hasValLabel = valColumns.includes("Final Label") || valColumns.includes("taskLabel");
        const hasRestText = restColumns.includes("translated_text");
        if (!hasValText || !hasValLabel) {
            console.error("[uploadTaskBundle] Column validation failed for val data:", valColumns, hasValText, hasValLabel);
            return res.status(400).json({
                success: false,
                message: "The labeled dataset must include text and task_label columns.",
            });
        }
        if (!hasRestText) {
            console.error("[uploadTaskBundle] Column validation failed for rest data:", restColumns);
            return res.status(400).json({
                success: false,
                message: "The unlabeled dataset must include a text column.",
            });
        }
        // Ensure Directories and Write Files
        console.log("[uploadTaskBundle] Step 5: Saving files to disk...");
        (0, fileUpload_1.ensureRestDatasetsDir)();
        (0, fileUpload_1.ensureValDatasetsDir)();
        const uploadFilename = (0, fileUpload_1.generateUploadFilename)(dAllFile.originalname);
        const valFilename = (0, fileUpload_1.generateUploadFilename)(dValFile.originalname);
        const sharedUploadsPath = (0, fileUpload_1.getUploadsPath)(uploadFilename);
        const valPath = (0, fileUpload_1.getValDatasetPath)(valFilename);
        console.log(`[uploadTaskBundle] Writing dall file to ${sharedUploadsPath}`);
        await promises_1.default.writeFile(sharedUploadsPath, dAllFile.buffer, "utf-8");
        console.log(`[uploadTaskBundle] Writing val file to ${valPath}`);
        await promises_1.default.writeFile(valPath, dValFile.buffer, "utf-8");
        // DB: Create Task
        console.log("[uploadTaskBundle] Creating task in MongoDB...");
        const taskDetailsCollection = (0, database_service_1.getCollection)(TASKS_COLLECTION);
        const taskData = {
            name: taskInfo.name,
            description: taskInfo.description,
            type: taskInfo.type,
            labels,
            file: uploadFilename,
            restFile: uploadFilename,
            valFile: valFilename,
            columns: ["text"],
            userID: userID,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const insertResult = await taskDetailsCollection.insertOne(taskData);
        const taskId = insertResult.insertedId.toString();
        console.log("[uploadTaskBundle] Task created with ID:", taskId);
        // seed annotations
        console.log("[uploadTaskBundle] Seeding annotations from D_val...");
        const annotations = valRows
            .map((row, idx) => {
            const rawLabel = row.task_label ?? row.taskLabel ?? "";
            const labels = String(rawLabel)
                .split(",")
                .map((label) => label.trim())
                .filter(Boolean);
            const textValue = getRowTextValue(row);
            if (!textValue || labels.length === 0) {
                return null;
            }
            const sampleContent = {
                ...row,
                text_combined: textValue,
            };
            return {
                taskId,
                sampleId: idx + 1,
                sampleContent,
                labels,
                source: "val",
                aiAnnotation: null,
                createdBy: userID,
                createdAt: new Date().toISOString(),
            };
        })
            .filter((row) => row !== null);
        if (annotations.length > 0) {
            console.log(`[uploadTaskBundle] Inserting ${annotations.length} annotations...`);
            const annotationCollection = (0, database_service_1.getCollection)(ANNOTATION_COLLECTION);
            await annotationCollection.insertMany(annotations);
            console.log("[uploadTaskBundle] Annotations inserted.");
        }
        else {
            console.warn("[uploadTaskBundle] No valid annotations found in D_val to seed.");
        }
        console.log("[uploadTaskBundle] Bundle upload completed successfully.");
        return res.status(200).json({
            success: true,
            message: "Bundle uploaded successfully",
            taskId,
            fileName: uploadFilename,
            restFileName: uploadFilename,
            valFileName: valFilename,
            valSummary: {
                rows: valRows.length,
                columns: valColumns,
            },
            restSummary: {
                rows: restRows.length,
                columns: restColumns,
            },
            task: {
                _id: taskId,
                ...taskData,
            },
        });
    }
    catch (error) {
        console.error("[uploadTaskBundle] Unexpected error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to upload bundle",
        });
    }
}
// Helper function to read and parse CSV
async function readCsvFile(filePath) {
    try {
        const fileContent = await promises_1.default.readFile(filePath, "utf-8");
        const parseResult = papaparse_1.default.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false, // Keep all values as strings
        });
        if (parseResult.errors.length > 0) {
            console.warn("CSV parsing warnings:", parseResult.errors);
        }
        return parseResult.data;
    }
    catch (error) {
        console.error("Error reading CSV file:", error);
        return [];
    }
}
async function getCsvData(req, res) {
    try {
        const userID = req.user?.userId;
        if (!userID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - user not authenticated",
            });
        }
        const { fileName } = req.params;
        const valFileName = typeof req.query.valFile === "string" ? req.query.valFile : fileName;
        if (!fileName) {
            return res.status(400).json({
                success: false,
                message: "Invalid - file name required",
            });
        }
        const response = {
            file: [],
            val_file: [],
            rest_file: [],
            guide_file: [],
            headers: []
        };
        // Read all files using PapaParse
        const mainFile = (0, fileUpload_1.fileExists)(fileName);
        const valFile = (0, fileUpload_1.valFileExists)(valFileName);
        const restFile = (0, fileUpload_1.restFileExists)(fileName);
        const guideFile = (0, fileUpload_1.guideFileExists)(fileName);
        if (mainFile.exists) {
            response.file = await readCsvFile(mainFile.path);
            if (response.file.length > 0) {
                response.headers = Object.keys(response.file[0]);
            }
        }
        if (valFile.exists) {
            response.val_file = await readCsvFile(valFile.path);
            // If we only have val data, use its headers
            if (response.headers.length === 0 && response.val_file.length > 0) {
                response.headers = Object.keys(response.val_file[0]);
            }
        }
        if (restFile.exists) {
            response.rest_file = await readCsvFile(restFile.path);
            if (response.file.length === 0 && response.rest_file.length > 0) {
                response.file = response.rest_file;
                response.headers = Object.keys(response.rest_file[0]);
            }
        }
        if (guideFile.exists) {
            response.guide_file = await readCsvFile(guideFile.path);
            if (response.file.length === 0 && response.rest_file.length > 0) {
                response.file = response.rest_file;
                response.headers = Object.keys(response.rest_file[0]);
            }
        }
        if (response.file.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No files found",
            });
        }
        return res.status(200).json({
            success: true,
            data: response.file,
            val_data: response.val_file,
            rest_data: response.rest_file,
            guide_data: response.guide_file,
            headers: response.headers,
            fileName: fileName,
        });
    }
    catch (error) {
        console.error("Error retrieving file:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve file",
            error: error,
        });
    }
}
async function checkValFileExists(req, res) {
    try {
        const { fileName } = req.params;
        if (!fileName) {
            return res.status(400).json({
                success: false,
                message: "File name is required",
            });
        }
        const check = (0, fileUpload_1.valFileExists)(fileName);
        return res.status(200).json({
            success: true,
            exists: check.exists,
        });
    }
    catch (error) {
        console.error("Error checking validation file existence:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
}
