"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const annotations_service_1 = require("../services/annotations.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
//Adding user authentication, making this a protected route
router.use(auth_middleware_1.authenticateToken);
// Adds a single annotation for a task (based on taskID)
router.post("/add", annotations_service_1.addAnnotation);
// Get a task's annotations
router.get('/get-annotations/:taskId', annotations_service_1.getTaskAnnotations);
// Updates a single annotation
router.put("/update", annotations_service_1.updateAnnotation);
exports.default = router;
