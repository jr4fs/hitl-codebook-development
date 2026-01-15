import { Request, Response } from "express";
import { CreateTaskRequest, Task } from "@common/types/tasks";
import { getCollection } from "./database.service";
import { fileExists } from "../utils/fileUpload";

interface TaskValidation {
  valid: boolean;
  errors: string[];
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
}

//Validates task creation request payload
function validateTaskPayload(payload: CreateTaskRequest): TaskValidation {
  const errors: string[] = [];

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
  } else {
    payload.labels.forEach((label: { name?: string; keywords?: string[] }, idx: number) => {
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
  } else if (!fileExists(payload.file)) {
    errors.push("File does not exist or has been deleted");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

//Creates a new task and stores it in the TaskDetails collection
export async function createTask(req: AuthRequest, res: Response) {
  
  const userID = req.user?.userId;
  
   if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated"
      });
    }

  try {
    const payload: CreateTaskRequest = {
      name: req.body.name,
      description: req.body.description,
      type: req.body.type,
      labels: req.body.labels,
      file: req.body.file,
      userID: userID
    };

    // Validate payload
    const validation = validateTaskPayload(payload);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Task Creation Validation failed",
        errors: {
          payload: validation.errors
        }
      });
    }

    const taskDetailsCollection = getCollection<Task>("TaskDetails");

    // Create task document
    const newTask: Omit<Task, "_id"> = {
      name: payload.name,
      description: payload.description,
      type: payload.type,
      labels: payload.labels,
      file: payload.file,
      userID: userID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await taskDetailsCollection.insertOne(newTask);

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      taskId: result.insertedId.toString(),
      task: {
        _id: result.insertedId.toString(),
        ...newTask
      }
    });
  } catch (error: any) {
    console.error("Error creating task:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create task"
    });
  }
}

//Retrieves all tasks for a specific user
export async function getUserTasks(req: AuthRequest, res: Response) {
  try {
    const userID = req.user?.userId;

    if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated"
      });
    }

    const taskDetailsCollection = getCollection<Task>("TaskDetails");
    const tasks = await taskDetailsCollection
      .find({ userID: userID })
      .toArray();

    return res.status(200).json({
      success: true,
      tasks,
      count: tasks.length
    });
  } catch (error: any) {
    console.error("Error retrieving tasks:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve tasks"
    });
  }
}

/**
 * Handles CSV file upload using multer
 * Returns the stored filename to be used in task creation
 */
export async function uploadTaskFile(req: AuthRequest, res: Response) {
  try {
    const userID = req.user?.userId;

    if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided"
      });
    }
    if (!fileExists(req.file.filename)) {
      return res.status(500).json({
        success: false,
        message: "File was uploaded but was not saved, internal server error"
      });
    }
    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      filePath: req.file.filename
    });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload file"
    });
  }
}