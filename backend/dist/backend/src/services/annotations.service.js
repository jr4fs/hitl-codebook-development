"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAnnotation = addAnnotation;
exports.getTaskAnnotations = getTaskAnnotations;
exports.updateAnnotation = updateAnnotation;
const mongodb_1 = require("mongodb");
const database_service_1 = require("./database.service");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ANNOTATION_COLLECTION = process.env.ANNOTATION_COLLECTION_NAME || "AnnotationDetails";
function validateAnnotationPayload(payload) {
    const errors = [];
    if (!payload.taskId) {
        errors.push("Task ID is required");
    }
    if (!payload.annotationSampleRow || Object.keys(payload.annotationSampleRow).length < 1) {
        errors.push("Sample empty/not found");
    }
    if (!payload.labels || payload.labels.length < 1) {
        errors.push("Labels empty");
    }
    return {
        valid: errors.length === 0,
        errors: errors
    };
}
async function addAnnotation(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - user not authenticated"
        });
    }
    const payload = {
        taskId: req.body.taskId,
        sampleId: req.body.sampleId,
        annotationSampleRow: req.body.annotationSampleRow,
        labels: req.body.labels
    };
    const validation = validateAnnotationPayload(payload);
    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            message: `Validation failed: ${validation.errors.join(", ")}`
        });
    }
    try {
        const collection = (0, database_service_1.getCollection)(ANNOTATION_COLLECTION);
        const newAnnotation = {
            taskId: payload.taskId,
            sampleId: req.body.sampleId,
            sampleContent: payload.annotationSampleRow,
            labels: payload.labels,
            source: "val",
            aiAnnotation: null,
            createdBy: userId,
            createdAt: new Date().toISOString()
        };
        const result = await collection.insertOne(newAnnotation);
        return res.status(201).json({
            success: true,
            message: "Annotation saved successfully",
            annotationId: result.insertedId.toString()
        });
    }
    catch (error) {
        console.error("Error saving annotation:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to save annotation"
        });
    }
}
async function getTaskAnnotations(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - user not authenticated"
        });
    }
    const { taskId } = req.params;
    if (!taskId) {
        return res.status(400).json({
            success: false,
            message: "Invalid - task ID cannot be empty"
        });
    }
    try {
        const collection = (0, database_service_1.getCollection)(ANNOTATION_COLLECTION);
        const result = await collection.find({
            "taskId": taskId,
            "createdBy": userId
        }).toArray();
        if (!result || result.length === 0) {
            return res.status(200).json({
                success: true,
                taskId: taskId,
                annotations: [],
                message: "No annotations found for this task"
            });
        }
        return res.status(200).json({
            success: true,
            taskId: taskId,
            annotations: result,
            message: `Annotations found for ${taskId}`
        });
    }
    catch (error) {
        console.error(`Error fetching annotations for task (${taskId}):, ${error}`);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch annotations"
        });
    }
}
async function updateAnnotation(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - user not authenticated"
        });
    }
    const { annotationId, labels } = req.body;
    if (!annotationId || !labels || labels.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Annotation ID and labels are required"
        });
    }
    try {
        const collection = (0, database_service_1.getCollection)(ANNOTATION_COLLECTION);
        const result = await collection.updateOne({ _id: new mongodb_1.ObjectId(annotationId), createdBy: userId }, { $set: { labels, updatedAt: new Date().toISOString() } });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Annotation not found or you don't have permission to update it"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Annotation updated successfully"
        });
    }
    catch (error) {
        console.error("Error updating annotation:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update annotation"
        });
    }
}
