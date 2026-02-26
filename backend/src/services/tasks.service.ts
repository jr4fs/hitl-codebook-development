import { Request, Response } from "express";
import { CreateTaskRequest, Task } from "@common/types/tasks";
import { AnonymizeConfig } from "@common/types/anonymize";
import { getCollection } from "./database.service";
import {
  anonymizeAndSaveCsv,
  fileExists,
  restFileExists,
  valFileExists,
} from "../utils/fileUpload";
import { ObjectId } from "mongodb";
import Papa from "papaparse";
import fs from "fs/promises";
import dotenv from "dotenv";
dotenv.config();

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

const TASKS_COLLECTION = process.env.TASKS_COLLECTION_NAME || "TaskDetails";
const ANONYMIZE_CONFIG_COLLECTION = "AnonymizeConfig";
const CONFIG_DOC_ID = "global";

/**
 * Fetches the global anonymize config from DB (or returns null if none exists)
 */
async function getAnonymizeConfigFromDB(): Promise<AnonymizeConfig | null> {
  try {
    const collection = getCollection<AnonymizeConfig>(
      ANONYMIZE_CONFIG_COLLECTION,
    );
    return await collection.findOne({ _id: CONFIG_DOC_ID as any });
  } catch (error) {
    console.error("Error fetching anonymize config:", error);
    return null;
  }
}

// Validates task creation request payload
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
    payload.labels.forEach(
      (label: { name?: string; keywords?: string[] }, idx: number) => {
        if (!label.name || label.name.trim().length === 0) {
          errors.push(`Label ${idx + 1}: Label name is required`);
        }
        if (!Array.isArray(label.keywords) || label.keywords.length === 0) {
          errors.push(
            `Label ${idx + 1}: Keywords must be an array and must contain at least one keyword`,
          );
        }
      },
    );
  }

  if (!payload.file || payload.file.trim().length === 0) {
    errors.push("File path is required");
  } else if (!fileExists(payload.file)) {
    errors.push("File does not exist or has been deleted");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Creates a new task and stores it in the TaskDetails collection
export async function createTask(req: AuthRequest, res: Response) {
  const userID = req.user?.userId;

  if (!userID) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - user not authenticated",
    });
  }

  try {
    const payload: CreateTaskRequest = {
      name: req.body.name,
      description: req.body.description,
      type: req.body.type,
      labels: req.body.labels,
      codebook: Array.isArray(req.body.codebook)
        ? req.body.codebook
        : undefined,
      codebookSourceTaskId:
        typeof req.body.codebookSourceTaskId === "string"
          ? req.body.codebookSourceTaskId
          : undefined,
      codebookSourceTaskName:
        typeof req.body.codebookSourceTaskName === "string"
          ? req.body.codebookSourceTaskName
          : undefined,
      file: req.body.file,
      columns: req.body.columns,
      userID: userID,
    };

    // Validate payload
    const validation = validateTaskPayload(payload);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Task Creation Validation failed",
        errors: {
          payload: validation.errors,
        },
      });
    }

    const taskDetailsCollection = getCollection<Task>(TASKS_COLLECTION);
    const taskId = req.body.taskId?.toString().trim();

    console.log(`[createTask] userID: ${userID}, taskId in request: ${taskId}`);

    // Create task document
    const taskData: Omit<Task, "_id"> = {
      name: payload.name,
      description: payload.description,
      type: payload.type,
      labels: payload.labels,
      ...(Array.isArray(payload.codebook)
        ? { codebook: payload.codebook }
        : {}),
      ...(payload.codebookSourceTaskId
        ? { codebookSourceTaskId: payload.codebookSourceTaskId }
        : {}),
      ...(payload.codebookSourceTaskName
        ? { codebookSourceTaskName: payload.codebookSourceTaskName }
        : {}),
      file: payload.file,
      columns: payload.columns,
      userID: userID,
      createdAt: req.body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (taskId) {
      console.log(`[createTask] Attempting update for taskId: ${taskId}`);
      const updateDoc: Partial<Task> = {
        name: taskData.name,
        description: taskData.description,
        type: taskData.type,
        labels: taskData.labels,
        file: taskData.file,
        columns: taskData.columns,
        userID: taskData.userID,
        updatedAt: taskData.updatedAt,
      };

      if (Array.isArray(payload.codebook)) {
        updateDoc.codebook = payload.codebook;
      }

      if (payload.codebookSourceTaskId) {
        updateDoc.codebookSourceTaskId = payload.codebookSourceTaskId;
      }

      if (payload.codebookSourceTaskName) {
        updateDoc.codebookSourceTaskName = payload.codebookSourceTaskName;
      }

      const result = await taskDetailsCollection.updateOne(
        { _id: new ObjectId(taskId) as any, userID: userID },
        { $set: updateDoc },
      );
      console.log(
        `[createTask] Update result: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`,
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Task not found or you don't have permission to update it",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Task updated successfully",
        taskId: taskId,
        task: {
          _id: taskId,
          ...taskData,
        },
      });
    }

    console.log(`[createTask] No taskId provided, performing insertOne`);
    const result = await taskDetailsCollection.insertOne(taskData);
    console.log(`[createTask] insertOne success: ${result.insertedId}`);

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      taskId: result.insertedId.toString(),
      task: {
        _id: result.insertedId.toString(),
        ...taskData,
      },
    });
  } catch (error: any) {
    console.error("Error creating task:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create task",
    });
  }
}

// Retrieves all tasks for a specific user
export async function getUserTasks(req: AuthRequest, res: Response) {
  try {
    const userID = req.user?.userId;

    if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated",
      });
    }

    const taskDetailsCollection = getCollection<Task>("TaskDetails");
    const tasks = await taskDetailsCollection
      .find({ userID: userID })
      .toArray();

    return res.status(200).json({
      success: true,
      tasks,
      count: tasks.length,
    });
  } catch (error: any) {
    console.error("Error retrieving tasks:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve tasks",
    });
  }
}

// Retrieves all tasks for a specific user
export async function getTaskByID(req: AuthRequest, res: Response) {
  try {
    const userID = req.user?.userId;
    const { taskId } = req.params;

    if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated",
      });
    }

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "Invalid - No task ID found",
      });
    }
    const taskDetailsCollection = getCollection<Task>(TASKS_COLLECTION);
    const task = await taskDetailsCollection.findOne({
      _id: new ObjectId(taskId) as any,
      userID: userID,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error: any) {
    console.error("Error retrieving task:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve task",
    });
  }
}

export async function saveTaskCodebook(req: AuthRequest, res: Response) {
  try {
    const userID = req.user?.userId;
    const { taskId, codebook } = req.body as {
      taskId?: string;
      codebook?: unknown;
    };

    if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated",
      });
    }

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "Invalid - No task ID found",
      });
    }

    if (!Array.isArray(codebook)) {
      return res.status(400).json({
        success: false,
        message: "Invalid codebook payload",
      });
    }

    const taskDetailsCollection = getCollection<Task>(TASKS_COLLECTION);
    const result = await taskDetailsCollection.updateOne(
      { _id: new ObjectId(taskId) as any, userID: userID },
      {
        $set: {
          codebook,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found or you don't have permission to update it",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Codebook saved",
    });
  } catch (error: any) {
    console.error("Error saving codebook:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save codebook",
    });
  }
}

/*
 * Handles CSV file upload using multer
 * Returns the stored filename to be used in task creation
 */
export async function uploadTaskFile(req: AuthRequest, res: Response) {
  try {
    const userID = req.user?.userId;

    if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    // Fetch anonymize config from DB to pass to pybackend
    const anonymizeConfig = await getAnonymizeConfigFromDB();

    let filename: string;
    try {
      filename = await anonymizeAndSaveCsv(
        req.file,
        anonymizeConfig ?? undefined,
      );
    } catch (error: any) {
      const message = error?.message || "Failed to anonymize CSV";
      const status = message.includes("saved") ? 500 : 502;
      console.error("Error processing upload:", message);
      return res.status(status).json({
        success: false,
        message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      filePath: filename,
    });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload file",
      error: error,
    });
  }
}

// Helper function to read and parse CSV
async function readCsvFile(filePath: string): Promise<any[]> {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");

    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep all values as strings
    });

    if (parseResult.errors.length > 0) {
      console.warn("CSV parsing warnings:", parseResult.errors);
    }

    return parseResult.data;
  } catch (error) {
    console.error("Error reading CSV file:", error);
    return [];
  }
}

export async function getCsvData(req: AuthRequest, res: Response) {
  try {
    const userID = req.user?.userId;

    if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated",
      });
    }

    const { fileName } = req.params;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: "Invalid - file name required",
      });
    }

    const response = {
      file: [] as any[],
      val_file: [] as any[],
      rest_file: [] as any[],
      headers: [] as string[],
    };

    // Read all files using PapaParse
    const mainFile = fileExists(fileName);
    const valFile = valFileExists(fileName);
    const restFile = restFileExists(fileName);

    if (mainFile.exists) {
      response.file = await readCsvFile(mainFile.path);
      if (response.file.length > 0) {
        response.headers = Object.keys(response.file[0]);
      }
    }

    if (valFile.exists) {
      response.val_file = await readCsvFile(valFile.path);
      // If we only have val data, use its headers
      if (response.headers.length === 0 && response.val_file.length > 0) {
        response.headers = Object.keys(response.val_file[0]);
      }
    }

    if (restFile.exists) {
      response.rest_file = await readCsvFile(restFile.path);
    }

    if (response.file.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No files found",
      });
    }

    return res.status(200).json({
      success: true,
      data: response.file,
      val_data: response.val_file,
      rest_data: response.rest_file,
      headers: response.headers,
      fileName: fileName,
    });
  } catch (error: any) {
    console.error("Error retrieving file:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve file",
      error: error,
    });
  }
}

export async function checkValFileExists(req: AuthRequest, res: Response) {
  try {
    const { fileName } = req.params;
    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: "File name is required",
      });
    }

    const check = valFileExists(fileName);

    return res.status(200).json({
      success: true,
      exists: check.exists,
    });
  } catch (error: any) {
    console.error("Error checking validation file existence:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
}
