import { Router } from "express";
import { createTask, getUserTasks, uploadTaskFile } from "../services/tasks.service";
import { uploadCSV } from "../utils/fileUpload";
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

//Adding user authentication, making this a protected route
router.use(authenticateToken);

// Upload CSV file (returns filename to use in task creation)
// Expects form-data with field name "file"
router.post("/upload", uploadCSV.single("file"), uploadTaskFile);

// Create a new task
router.post("/createTask", createTask);

// Get all tasks for a user
router.get("/getTasks", getUserTasks);

export default router;