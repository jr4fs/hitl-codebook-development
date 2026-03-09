import { Request, Response } from "express";
import { CreateTaskRequest, Task } from "@common/types/tasks";
import { AnonymizeConfig } from "@common/types/anonymize";
import { AnnotationItem } from "@common/types/annotations";
import { getCollection } from "./database.service";
import {
  fileExists,
  restFileExists,
  valFileExists,
  guideFileExists,
  ensureRestDatasetsDir,
  ensureValDatasetsDir,
  getRestDatasetPath,
  getValDatasetPath,
  ensureUploadsDir,
  generateUploadFilename,
  getUploadsPath,
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
const ANNOTATION_COLLECTION =
  process.env.ANNOTATION_COLLECTION_NAME || "AnnotationDetails";

const TASK_JSON_REQUIRED_KEYS = ["taskname", "description"];

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

function parseCsvBuffer(buffer: Buffer): any[] {
  try {
    const csvText = buffer.toString("utf-8");
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (parseResult.errors.length > 0) {
      console.warn("CSV parsing warnings:", parseResult.errors);
    }

    return Array.isArray(parseResult.data) ? parseResult.data : [];
  } catch (error) {
    console.error("Error in parseCsvBuffer:", error);
    throw error;
  }
}

function parseTaskJson(buffer: Buffer): {
  name: string;
  description: string;
  type: Task["type"];
} {
  try {
    const raw = buffer.toString("utf-8");
    const taskJson = JSON.parse(raw) as {
      taskname?: string;
      taskName?: string;
      name?: string;
      description?: string;
      type?: string;
    };

    const name = taskJson.taskname || taskJson.taskName || taskJson.name || "";
    const description = taskJson.description || "";
    const type: Task["type"] =
      taskJson.type === "Single-class" ? "Single-class" : "Multiclass";

    if (!name.trim() || !description.trim()) {
      throw new Error(
        `Task JSON must include ${TASK_JSON_REQUIRED_KEYS.join(", ")}`,
      );
    }

    return { name: name.trim(), description: description.trim(), type };
  } catch (error) {
    console.error("Error in parseTaskJson:", error);
    throw error;
  }
}

function parseLabelsJson(buffer: Buffer) {
  try {
    const raw = buffer.toString("utf-8");
    const labelsJson = JSON.parse(raw) as {
      labels?: Array<{
        name?: string;
        description?: string;
        keywords?: string[];
        guidelines?: unknown;
      }>;
    };

    const labels = Array.isArray(labelsJson.labels) ? labelsJson.labels : [];
    if (labels.length === 0) {
      throw new Error("Labels JSON must include a non-empty labels array");
    }

    return labels.map((label, idx) => {
      const name = label.name?.trim() || "";
      const definition = label.description?.trim() || "";
      const keywords = Array.isArray(label.keywords)
        ? label.keywords.map((kw) => kw.trim()).filter(Boolean)
        : [];
      const guidelines = Array.isArray(label.guidelines)
        ? label.guidelines
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
          .join("\n")
        : typeof label.guidelines === "string"
          ? label.guidelines.trim()
          : undefined;

      if (!name || !definition || keywords.length === 0) {
        throw new Error(
          `Label ${idx + 1} must include name, description, and keywords`,
        );
      }

      return {
        name,
        definition,
        keywords,
        ...(guidelines ? { guidelines } : {}),
      };
    });
  } catch (error) {
    console.error("Error in parseLabelsJson:", error);
    throw error;
  }
}

function getRowTextValue(row: Record<string, unknown>): string {
  const candidates = ["text", "clean_text", "raw_text"];
  for (const key of candidates) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function getColumnsFromRows(rows: Array<Record<string, unknown>>): string[] {
  if (rows.length === 0) return [];
  const clean_cols = Object.keys(rows[0]).filter(key => String(key).trim() !== "");
  return clean_cols;
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

    ensureUploadsDir();
    const filename = generateUploadFilename(req.file.originalname);
    const outputPath = getUploadsPath(filename);
    await fs.writeFile(outputPath, req.file.buffer, "utf-8");

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

/*
 * Uploads D_val, D_all, task JSON, and labels JSON
 * D_all in rest_datasets, D_val in val_datasets
 * Creates the task and seeds annotations from D_val
 */
export async function uploadTaskBundle(req: AuthRequest, res: Response) {
  const userID = req.user?.userId;
  console.log(`[uploadTaskBundle] Started by user: ${userID}`);

  if (!userID) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - user not authenticated",
    });
  }

  try {
    const files = req.files as
      | Record<string, Express.Multer.File[]>
      | undefined;

    const dValFile = files?.d_val?.[0];
    const dAllFile = files?.d_all?.[0];
    const taskJsonFile = files?.task_json?.[0];
    const labelsJsonFile = files?.labels_json?.[0];

    if (!dValFile || !dAllFile || !taskJsonFile || !labelsJsonFile) {
      console.error("[uploadTaskBundle] Missing files:", {
        d_val: !!dValFile,
        d_all: !!dAllFile,
        task_json: !!taskJsonFile,
        labels_json: !!labelsJsonFile,
      });
      return res.status(400).json({
        success: false,
        message: "Missing files. Expected d_val, d_all, task_json, labels_json.",
      });
    }

    // Parse Task JSON
    console.log("[uploadTaskBundle] Parsing task_json...");
    const taskInfo = parseTaskJson(taskJsonFile.buffer);
    console.log("[uploadTaskBundle] Task Info parsed:", taskInfo.name);

    // Parse Labels JSON
    console.log("[uploadTaskBundle] Parsing labels_json...");
    const labels = parseLabelsJson(labelsJsonFile.buffer);
    console.log("[uploadTaskBundle] Labels parsed, count:", labels.length);

    // Parse CSVs
    console.log("[uploadTaskBundle] Parsing CSV files...");
    const valRows = parseCsvBuffer(dValFile.buffer) as Array<
      Record<string, unknown>
    >;
    const restRows = parseCsvBuffer(dAllFile.buffer) as Array<
      Record<string, unknown>
    >;
    console.log(
      `[uploadTaskBundle] CSVs parsed. Val rows: ${valRows.length}, Rest rows: ${restRows.length}`,
    );

    // Validate Columns
    console.log("[uploadTaskBundle] Validating columns...");
    const valColumns = getColumnsFromRows(valRows);
    const restColumns = getColumnsFromRows(restRows);

    const hasValText = valColumns.includes("translated_text");
    const hasValLabel =
      valColumns.includes("Final Label") || valColumns.includes("taskLabel");
    const hasRestText = restColumns.includes("translated_text");

    if (!hasValText || !hasValLabel) {
      console.error("[uploadTaskBundle] Column validation failed for val data:", valColumns, hasValText, hasValLabel);
      return res.status(400).json({
        success: false,
        message: "The labeled dataset must include text and task_label columns.",
      });
    }

    if (!hasRestText) {
      console.error("[uploadTaskBundle] Column validation failed for rest data:", restColumns);
      return res.status(400).json({
        success: false,
        message: "The unlabeled dataset must include a text column.",
      });
    }

    // Ensure Directories and Write Files
    console.log("[uploadTaskBundle] Step 5: Saving files to disk...");
    ensureRestDatasetsDir();
    ensureValDatasetsDir();

    const uploadFilename = generateUploadFilename(dAllFile.originalname);
    const valFilename = generateUploadFilename(dValFile.originalname);
    const sharedUploadsPath = getUploadsPath(uploadFilename);
    const valPath = getValDatasetPath(valFilename);

    console.log(`[uploadTaskBundle] Writing dall file to ${sharedUploadsPath}`);
    await fs.writeFile(sharedUploadsPath, dAllFile.buffer, "utf-8");
    console.log(`[uploadTaskBundle] Writing val file to ${valPath}`);
    await fs.writeFile(valPath, dValFile.buffer, "utf-8");

    // DB: Create Task
    console.log("[uploadTaskBundle] Creating task in MongoDB...");
    const taskDetailsCollection = getCollection<Task>(TASKS_COLLECTION);
    const taskData: Omit<Task, "_id"> = {
      name: taskInfo.name,
      description: taskInfo.description,
      type: taskInfo.type,
      labels,
      file: uploadFilename,
      restFile: uploadFilename,
      valFile: valFilename,
      columns: ["text"],
      userID: userID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const insertResult = await taskDetailsCollection.insertOne(taskData);
    const taskId = insertResult.insertedId.toString();
    console.log("[uploadTaskBundle] Task created with ID:", taskId);

    // seed annotations
    console.log("[uploadTaskBundle] Seeding annotations from D_val...");
    const annotations: AnnotationItem[] = valRows
      .map((row, idx) => {
        const rawLabel = row.task_label ?? row.taskLabel ?? "";
        const labels = String(rawLabel)
          .split(",")
          .map((label: string) => label.trim())
          .filter(Boolean);

        const textValue = getRowTextValue(row);

        if (!textValue || labels.length === 0) {
          return null;
        }

        const sampleContent = {
          ...row,
          text_combined: textValue,
        } as Record<string, string>;

        return {
          taskId,
          sampleId: idx + 1,
          sampleContent,
          labels,
          source: "val",
          aiAnnotation: null,
          createdBy: userID,
          createdAt: new Date().toISOString(),
        } as AnnotationItem;
      })
      .filter((row): row is AnnotationItem => row !== null);

    if (annotations.length > 0) {
      console.log(`[uploadTaskBundle] Inserting ${annotations.length} annotations...`);
      const annotationCollection = getCollection<AnnotationItem>(
        ANNOTATION_COLLECTION,
      );
      await annotationCollection.insertMany(annotations);
      console.log("[uploadTaskBundle] Annotations inserted.");
    } else {
      console.warn("[uploadTaskBundle] No valid annotations found in D_val to seed.");
    }

    console.log("[uploadTaskBundle] Bundle upload completed successfully.");
    return res.status(200).json({
      success: true,
      message: "Bundle uploaded successfully",
      taskId,
      fileName: uploadFilename,
      restFileName: uploadFilename,
      valFileName: valFilename,
      valSummary: {
        rows: valRows.length,
        columns: valColumns,
      },
      restSummary: {
        rows: restRows.length,
        columns: restColumns,
      },
      task: {
        _id: taskId,
        ...taskData,
      },
    });
  } catch (error: any) {
    console.error("[uploadTaskBundle] Unexpected error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload bundle",
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
    const valFileName =
      typeof req.query.valFile === "string" ? req.query.valFile : fileName;

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
      guide_file: [] as any[],
      headers: [] as string[]
    };

    // Read all files using PapaParse
    const mainFile = fileExists(fileName);
    const valFile = valFileExists(valFileName);
    const restFile = restFileExists(fileName);
    const guideFile = guideFileExists(fileName);

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
      if (response.file.length === 0 && response.rest_file.length > 0) {
        response.file = response.rest_file;
        response.headers = Object.keys(response.rest_file[0]);
      }
    }

    if (guideFile.exists) {
      response.guide_file = await readCsvFile(guideFile.path);
      if (response.file.length === 0 && response.rest_file.length > 0) {
        response.file = response.rest_file;
        response.headers = Object.keys(response.rest_file[0]);
      }
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
      guide_data: response.guide_file,
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
