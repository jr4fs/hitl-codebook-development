import { Router } from "express";
import { addAnnotation, getTaskAnnotations, updateAnnotation } from "../services/annotations.service";
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

//Adding user authentication, making this a protected route
router.use(authenticateToken);

// Adds a single annotation for a task (based on taskID)
router.post("/add", addAnnotation);

// Get a task's annotations
router.get('/get-annotations/:taskId', getTaskAnnotations);

// Updates a single annotation
router.put("/update", updateAnnotation);

export default router;