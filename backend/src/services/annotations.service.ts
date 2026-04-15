import { Request, Response } from "express";
import {
  AnnotationItem,
  AddAnnotationRequest,
  UpdateAnnotationRequest,
} from "@common/types/annotations";
import { ObjectId } from "mongodb";
import { getCollection } from "./database.service";
import { AuthRequest } from "./tasks.service";
import dotenv from "dotenv";
dotenv.config();

const ANNOTATION_COLLECTION =
  process.env.ANNOTATION_COLLECTION_NAME || "AnnotationDetails";

interface AnnotationValidation {
  valid: boolean;
  errors: string[];
}

function validateAnnotationPayload(
  payload: AddAnnotationRequest,
): AnnotationValidation {
  const errors: string[] = [];
  if (!payload.taskId) {
    errors.push("Task ID is required");
  }
  if (
    !payload.annotationSampleRow ||
    Object.keys(payload.annotationSampleRow).length < 1
  ) {
    errors.push("Sample empty/not found");
  }
  if (!payload.labels || payload.labels.length < 1) {
    errors.push("Labels empty");
  }
  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

export async function addAnnotation(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - user not authenticated",
    });
  }

  const payload: AddAnnotationRequest = {
    taskId: req.body.taskId,
    sampleId: req.body.sampleId,
    annotationSampleRow: req.body.annotationSampleRow,
    labels: req.body.labels,
  };

  const validation = validateAnnotationPayload(payload);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: `Validation failed: ${validation.errors.join(", ")}`,
    });
  }

  try {
    const collection = getCollection<AnnotationItem>(ANNOTATION_COLLECTION);

    const newAnnotation: AnnotationItem = {
      taskId: payload.taskId,
      sampleId: req.body.sampleId,
      sampleContent: payload.annotationSampleRow,
      labels: payload.labels,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    const result = await collection.insertOne(newAnnotation);

    return res.status(201).json({
      success: true,
      message: "Annotation saved successfully",
      annotationId: result.insertedId.toString(),
    });
  } catch (error: any) {
    console.error("Error saving annotation:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save annotation",
    });
  }
}

export async function getTaskAnnotations(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - user not authenticated",
    });
  }
  const { taskId } = req.params;
  if (!taskId) {
    return res.status(400).json({
      success: false,
      message: "Invalid - task ID cannot be empty",
    });
  }

  try {
    const collection = getCollection<AnnotationItem>(ANNOTATION_COLLECTION);
    const result = await collection
      .find({
        taskId: taskId,
        createdBy: userId,
      })
      .toArray();

    if (!result || result.length === 0) {
      return res.status(200).json({
        success: true,
        taskId: taskId,
        annotations: [],
        message: "No annotations found for this task",
      });
    }
    return res.status(200).json({
      success: true,
      taskId: taskId,
      annotations: result,
      message: `Annotations found for ${taskId}`,
    });
  } catch (error: any) {
    console.error(`Error fetching annotations for task (${taskId}):, ${error}`);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch annotations",
    });
  }
}
export async function updateAnnotation(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - user not authenticated",
    });
  }

  const { annotationId, labels, aiAnnotation } =
    req.body as UpdateAnnotationRequest;

  if (!annotationId) {
    return res.status(400).json({
      success: false,
      message: "Annotation ID is required",
    });
  }

  if ((!labels || labels.length === 0) && !aiAnnotation) {
    return res.status(400).json({
      success: false,
      message: "At least one of labels or aiAnnotation is required",
    });
  }

  try {
    const collection = getCollection<AnnotationItem>(ANNOTATION_COLLECTION);

    const updateDoc: any = { updatedAt: new Date().toISOString() };
    if (labels && labels.length > 0) updateDoc.labels = labels;
    if (aiAnnotation !== undefined) updateDoc.aiAnnotation = aiAnnotation;

    const result = await collection.updateOne(
      { _id: new ObjectId(annotationId) as any, createdBy: userId },
      { $set: updateDoc },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Annotation not found or you don't have permission to update it",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Annotation updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating annotation:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update annotation",
    });
  }
}
