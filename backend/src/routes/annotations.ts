import { Router } from "express";
import { addAnnotation, getTaskAnnotations, updateValAnnotation, updateGuideAnnotation } from "../services/annotations.service";
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

//Adding user authentication, making this a protected route
router.use(authenticateToken);

// Adds a single annotation for a task (based on taskID)
router.post("/add", addAnnotation);

// Upsert an annotation (AI assisted/annotator feedback flow)
router.post("/update-guide", updateGuideAnnotation);

// Get a task's annotations
router.get('/get-annotations/:taskId', getTaskAnnotations);

// Updates a single annotation
router.put("/update-val", updateValAnnotation);

export default router;