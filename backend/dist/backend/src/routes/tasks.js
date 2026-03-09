"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tasks_service_1 = require("../services/tasks.service");
const fileUpload_1 = require("../utils/fileUpload");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
//Adding user authentication, making this a protected route
router.use(auth_middleware_1.authenticateToken);
// Upload CSV file (returns filename to use in task creation)
// Expects form-data with field name "file"
router.post("/upload", fileUpload_1.uploadCSV.single("file"), tasks_service_1.uploadTaskFile);
// Upload D_val, D_all, task JSON, and labels JSON
router.post("/upload-bundle", fileUpload_1.uploadBundle.fields([
    { name: "d_val", maxCount: 1 },
    { name: "d_all", maxCount: 1 },
    { name: "task_json", maxCount: 1 },
    { name: "labels_json", maxCount: 1 },
]), tasks_service_1.uploadTaskBundle);
// Create a new task
router.post("/createTask", tasks_service_1.createTask);
// Save codebook for a task
router.post("/saveCodebook", tasks_service_1.saveTaskCodebook);
// Get all tasks for a user
router.get("/getTasks", tasks_service_1.getUserTasks);
// Get a single task's details
router.get("/getTask/:taskId", tasks_service_1.getTaskByID);
// Get CSV file when reloading a task
router.get("/csv/:fileName", tasks_service_1.getCsvData);
// Check if validation file exists
router.get("/checkValFile/:fileName", tasks_service_1.checkValFileExists);
exports.default = router;
