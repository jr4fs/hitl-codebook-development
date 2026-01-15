import { Router } from "express";
import { createTask, getUserTasks, uploadTaskFile } from "../services/tasks.service";
import { uploadCSV } from "../utils/fileUpload";

const router = Router();

// Upload CSV file (returns filename to use in task creation)
// Expects form-data with field name "file"
router.post("/upload", uploadCSV.single("file"), uploadTaskFile);

// Create a new task
router.post("/", createTask);

// Get all tasks for a user
router.get("/user/:userID", getUserTasks);

export default router;