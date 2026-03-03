import { Router } from "express";
import {
  createTask,
  getUserTasks,
  getTaskByID,
  uploadTaskFile,
  getCsvData,
  checkValFileExists,
  saveTaskCodebook,
  uploadTaskBundle,
} from "../services/tasks.service";
import { uploadCSV, uploadBundle } from "../utils/fileUpload";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

//Adding user authentication, making this a protected route
router.use(authenticateToken);

// Upload CSV file (returns filename to use in task creation)
// Expects form-data with field name "file"
router.post("/upload", uploadCSV.single("file"), uploadTaskFile);

// Upload D_val, D_all, task JSON, and labels JSON
router.post(
  "/upload-bundle",
  uploadBundle.fields([
    { name: "d_val", maxCount: 1 },
    { name: "d_all", maxCount: 1 },
    { name: "task_json", maxCount: 1 },
    { name: "labels_json", maxCount: 1 },
  ]),
  uploadTaskBundle,
);

// Create a new task
router.post("/createTask", createTask);

// Save codebook for a task
router.post("/saveCodebook", saveTaskCodebook);

// Get all tasks for a user
router.get("/getTasks", getUserTasks);

// Get a single task's details
router.get("/getTask/:taskId", getTaskByID);

// Get CSV file when reloading a task
router.get("/csv/:fileName", getCsvData);

// Check if validation file exists
router.get("/checkValFile/:fileName", checkValFileExists);

export default router;
