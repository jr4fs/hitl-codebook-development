import fs from "fs";
import path from "path";
import { Response } from "express";
import { AnnotationItem } from "@common/types/annotations";
import { Task } from "@common/types/tasks";
import { getCollection } from "./database.service";
import { ObjectId } from "mongodb";
import { AuthRequest } from "./tasks.service";
import {
  ensureMetricsDir,
  ensureCodebookDir,
  METRICS_DIR,
  CODEBOOK_DIR,
} from "../utils/metrics";
import fsAsync from "fs/promises";

const ANNOTATION_COLLECTION =
  process.env.ANNOTATION_COLLECTION_NAME || "AnnotationDetails";

const SAMPLE_HEADERS = [
  "text data",
  "batch_id",
  "batch_num",
  "LM_prediction_raw",
  "LM_prediction_parsed (the label)",
  "label provided by user if user corrects the LM prediction",
  "correct/incorrect as rated by expert",
  "final 'correct' label",
  "expert feedback",
  "codebook at the end of this example",
  "time to complete this example (seconds)",
];

const METADATA_HEADERS = [
  "unique_task_id",
  "task_name",
  "task_description",
  "labels_json",
  "synthesizer prompt",
  "initial codebook",
  "batch_size",
  "model specs (full name)",
  "size of manual seed set",
  "distribution of manual labels",
];

const BATCH_HEADERS = [
  "batch_id",
  "batch_num",
  "macro f1 [d_guide -- includes items in this batch]",
  "micro f1 [d_guide -- includes items in this batch]",
  "precision_per_label [d_guide -- includes items in this batch]",
  "recall_per_label [d_guide -- includes items in this batch]",
  "f1_per_label [d_guide -- includes items in this batch]",
  "false positive rate per label [d_guide -- includes items in this batch]",
  "false negative rate per label [d_guide -- includes items in this batch]",
  "expert feedback given",
  "codebook at the end of the batch",
  "prompt given to lm synthesizer",
  "time to complete a single batch",
];

const EXPORT_HEADERS = ["CODEBOOK RULES", "FINAL PROMPT"];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const needsQuotes = /[",\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function toJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function getTextData(
  sample?: Record<string, string>,
  preferredCol?: string,
): string {
  if (!sample) return "";
  const combined = sample["text_combined"];
  if (typeof combined === "string" && combined.trim()) {
    return combined.trim();
  }
  if (preferredCol && typeof sample[preferredCol] === "string") {
    const preferredText = sample[preferredCol].trim();
    if (preferredText) return preferredText;
  }
  const raw = sample["text"];
  if (typeof raw === "string") {
    return raw.trim();
  }
  for (const value of Object.values(sample)) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function formatLabelList(labels?: string[]): string {
  if (!labels || labels.length === 0) return "";
  return labels.join("|");
}

function getLabelDistribution(
  annotations: AnnotationItem[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const annotation of annotations) {
    for (const label of annotation.labels || []) {
      counts[label] = (counts[label] || 0) + 1;
    }
  }
  return counts;
}

function computeLabelMetrics(samples: AnnotationItem[], labelNames: string[]) {
  // Compute per-label TP/FP/FN/TN by comparing model labels vs reviewer labels.
  const perLabel: Record<
    string,
    { tp: number; fp: number; fn: number; tn: number }
  > = {};

  for (const label of labelNames) {
    perLabel[label] = { tp: 0, fp: 0, fn: 0, tn: 0 };
  }

  for (const sample of samples) {
    const predicted = new Set(sample.aiAnnotation?.label || []);
    const isCorrect = sample.aiAnnotation?.isCorrect === true;
    const truthLabels = isCorrect ? sample.aiAnnotation?.label : sample.labels;
    const truth = new Set(truthLabels || []);
    for (const label of labelNames) {
      const predHas = predicted.has(label);
      const truthHas = truth.has(label);
      if (predHas && truthHas) perLabel[label].tp += 1;
      else if (predHas && !truthHas) perLabel[label].fp += 1;
      else if (!predHas && truthHas) perLabel[label].fn += 1;
      else perLabel[label].tn += 1;
    }
  }

  const precision: Record<string, number> = {};
  const recall: Record<string, number> = {};
  const f1: Record<string, number> = {};
  const fpr: Record<string, number> = {};
  const fnr: Record<string, number> = {};

  let macroF1Sum = 0;
  let macroCount = 0;
  let microTp = 0;
  let microFp = 0;
  let microFn = 0;

  for (const label of labelNames) {
    const { tp, fp, fn, tn } = perLabel[label];
    const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Val = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
    const fprVal = fp + tn > 0 ? fp / (fp + tn) : 0;
    const fnrVal = fn + tp > 0 ? fn / (fn + tp) : 0;

    precision[label] = prec;
    recall[label] = rec;
    f1[label] = f1Val;
    fpr[label] = fprVal;
    fnr[label] = fnrVal;

    macroF1Sum += f1Val;
    macroCount += 1;
    microTp += tp;
    microFp += fp;
    microFn += fn;
  }

  const microPrec = microTp + microFp > 0 ? microTp / (microTp + microFp) : 0;
  const microRec = microTp + microFn > 0 ? microTp / (microTp + microFn) : 0;
  const microF1 =
    microPrec + microRec > 0
      ? (2 * microPrec * microRec) / (microPrec + microRec)
      : 0;
  const macroF1 = macroCount > 0 ? macroF1Sum / macroCount : 0;

  return {
    macroF1,
    microF1,
    precision,
    recall,
    f1,
    fpr,
    fnr,
  };
}

export async function generateSampleMetrics(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  const { taskId } = req.body as { taskId?: string };

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - user not authenticated",
    });
  }

  if (!taskId) {
    return res.status(400).json({
      success: false,
      message: "taskId is required",
    });
  }

  try {
    const collection = getCollection<AnnotationItem>(ANNOTATION_COLLECTION);
    const annotations = await collection
      .find({ taskId, createdBy: userId, aiAnnotation: { $exists: true } })
      .sort({ sampleId: 1 })
      .toArray();

    const sortedAnnotations = [...annotations].sort((a, b) => {
      const batchA = a.aiAnnotation?.batchNum ?? Number.MAX_SAFE_INTEGER;
      const batchB = b.aiAnnotation?.batchNum ?? Number.MAX_SAFE_INTEGER;
      if (batchA !== batchB) return batchA - batchB;
      return a.sampleId - b.sampleId;
    });

    const taskCollection = getCollection<Task>(
      process.env.TASKS_COLLECTION_NAME || "TaskDetails",
    );
    let taskQueryId: ObjectId | string = taskId;
    if (ObjectId.isValid(taskId)) {
      taskQueryId = new ObjectId(taskId);
    }
    const task = await taskCollection.findOne({
      _id: taskQueryId as any,
      userID: userId,
    });
    const preferredTextCol = task?.columns?.[0];

    ensureMetricsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "");
    const filename = `sample_metrics_${taskId}_${timestamp}.csv`;
    const filePath = path.join(METRICS_DIR, filename);

    const rows = sortedAnnotations.map((annotation) => {
      const ai = annotation.aiAnnotation;
      const isCorrect = ai?.isCorrect ?? null;
      const parsedLabels = formatLabelList(ai?.label);
      const manualLabels = formatLabelList(annotation.labels || []);
      const finalLabel = isCorrect === false ? manualLabels : parsedLabels;

      return {
        "text data": getTextData(annotation.sampleContent, preferredTextCol),
        batch_id: ai?.batchID ?? "",
        batch_num: ai?.batchNum ?? "",
        LM_prediction_raw: ai?.predictionRaw ?? "",
        "LM_prediction_parsed (the label)": parsedLabels,
        "label provided by user if user corrects the LM prediction":
          manualLabels,
        "correct/incorrect as rated by expert":
          isCorrect === null ? "" : isCorrect ? "correct" : "incorrect",
        "final 'correct' label": finalLabel,
        "expert feedback": ai?.feedback ?? "",
        "codebook at the end of this example": toJson(
          ai?.codebookSnapshotSample ?? ai?.codebookSnapshot ?? [],
        ),
        "time to complete this example (seconds)":
          ai?.timeToCompleteMs != null
            ? (ai.timeToCompleteMs / 1000).toFixed(3)
            : "",
      };
    });

    const headerLine = SAMPLE_HEADERS.map(csvEscape).join(",");
    const dataLines = rows.map((row) =>
      SAMPLE_HEADERS.map((header) => csvEscape((row as any)[header])).join(","),
    );

    fs.writeFileSync(filePath, [headerLine, ...dataLines].join("\n"), "utf-8");

    return res.status(200).json({
      success: true,
      filename,
    });
  } catch (error: any) {
    console.error("Error generating sample metrics:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate sample metrics",
    });
  }
}

export async function generateMetadataMetrics(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  const { taskId } = req.body as { taskId?: string };

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - user not authenticated",
    });
  }

  if (!taskId) {
    return res.status(400).json({
      success: false,
      message: "taskId is required",
    });
  }

  try {
    const taskCollection = getCollection<Task>(
      process.env.TASKS_COLLECTION_NAME || "TaskDetails",
    );
    let taskQueryId: ObjectId | string = taskId;
    if (ObjectId.isValid(taskId)) {
      taskQueryId = new ObjectId(taskId);
    }
    const task = await taskCollection.findOne({
      _id: taskQueryId as any,
      userID: userId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const annotations = await getCollection<AnnotationItem>(
      ANNOTATION_COLLECTION,
    )
      .find({ taskId, createdBy: userId })
      .toArray();

    const projectRoot = path.resolve(__dirname, "../../../");
    const promptPath = path.join(
      projectRoot,
      "pybackend",
      "prompts",
      "rule_synthesis_prompt.md",
    );
    let synthPrompt = "";
    try {
      synthPrompt = await fsAsync.readFile(promptPath, "utf-8");
    } catch (error) {
      console.warn("[metrics] rule_synthesis_prompt.md not readable:", error);
    }

    const labelDistribution = getLabelDistribution(annotations);

    const row = {
      unique_task_id: taskId,
      task_name: task.name,
      task_description: task.description,
      labels_json: toJson(task.labels || []),
      "synthesizer prompt": synthPrompt,
      "initial codebook": toJson(task.codebook || []),
      batch_size: 1,
      "model specs (full name)": "mistral:7b",
      "size of manual seed set": annotations.length,
      "distribution of manual labels": toJson(labelDistribution),
    };

    ensureMetricsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "");
    const filename = `metadata_metrics_${taskId}_${timestamp}.csv`;
    const filePath = path.join(METRICS_DIR, filename);

    const headerLine = METADATA_HEADERS.map(csvEscape).join(",");
    const dataLine = METADATA_HEADERS.map((header) =>
      csvEscape((row as any)[header]),
    ).join(",");

    await fsAsync.writeFile(filePath, `${headerLine}\n${dataLine}`, "utf-8");

    return res.status(200).json({
      success: true,
      filename,
    });
  } catch (error: any) {
    console.error("Error generating metadata metrics:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate metadata metrics",
    });
  }
}

export async function generateBatchMetrics(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  const { taskId } = req.body as { taskId?: string };

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - user not authenticated",
    });
  }

  if (!taskId) {
    return res.status(400).json({
      success: false,
      message: "taskId is required",
    });
  }

  try {
    const annotations = await getCollection<AnnotationItem>(
      ANNOTATION_COLLECTION,
    )
      .find({ taskId, createdBy: userId, aiAnnotation: { $exists: true } })
      .sort({ sampleId: 1 })
      .toArray();

    const taskCollection = getCollection<Task>(
      process.env.TASKS_COLLECTION_NAME || "TaskDetails",
    );
    let taskQueryId: ObjectId | string = taskId;
    if (ObjectId.isValid(taskId)) {
      taskQueryId = new ObjectId(taskId);
    }
    const task = await taskCollection.findOne({
      _id: taskQueryId as any,
      userID: userId,
    });

    const labelNames = task?.labels?.map((label) => label.name) || [];
    const batches = new Map<string, AnnotationItem[]>();
    for (const annotation of annotations) {
      const batchId = annotation.aiAnnotation?.batchID;
      if (!batchId) continue;
      if (!batches.has(batchId)) batches.set(batchId, []);
      batches.get(batchId)?.push(annotation);
    }

    const projectRoot = path.resolve(__dirname, "../../../");
    const promptPath = path.join(
      projectRoot,
      "pybackend",
      "prompts",
      "rule_synthesis_prompt.md",
    );
    let synthPrompt = "";
    try {
      synthPrompt = await fsAsync.readFile(promptPath, "utf-8");
    } catch (error) {
      console.warn("[metrics] rule_synthesis_prompt.md not readable:", error);
    }

    ensureMetricsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "");
    const filename = `batch_metrics_${taskId}_${timestamp}.csv`;
    const filePath = path.join(METRICS_DIR, filename);

    const sortedBatches = Array.from(batches.entries())
      .map(([batchId, items]) => ({
        batchId,
        items,
        batchNum:
          items.find((item) => typeof item.aiAnnotation?.batchNum === "number")
            ?.aiAnnotation?.batchNum ?? Number.MAX_SAFE_INTEGER,
        minSampleId: Math.min(...items.map((item) => item.sampleId)),
      }))
      .sort((a, b) => {
        if (a.batchNum !== b.batchNum) return a.batchNum - b.batchNum;
        return a.minSampleId - b.minSampleId;
      });

    const rows = sortedBatches.map((batch, index) => {
      const { batchId, items } = batch;
      const metrics = computeLabelMetrics(items, labelNames);
      const lastSample = items[items.length - 1];
      const batchNum =
        Number.isFinite(batch.batchNum) &&
        batch.batchNum !== Number.MAX_SAFE_INTEGER
          ? batch.batchNum
          : index + 1;

      const feedbacks = items
        .map((item) => item.aiAnnotation?.feedback)
        .filter((val): val is string => Boolean(val));

      const batchDurationMs =
        items.find((item) => item.aiAnnotation?.batchDurationMs != null)
          ?.aiAnnotation?.batchDurationMs ?? null;
      const batchTimeMs =
        batchDurationMs != null
          ? batchDurationMs
          : items.reduce(
              (sum, item) => sum + (item.aiAnnotation?.timeToCompleteMs || 0),
              0,
            );

      return {
        batch_id: batchId,
        batch_num: batchNum,
        "macro f1 [d_guide -- includes items in this batch]": metrics.macroF1,
        "micro f1 [d_guide -- includes items in this batch]": metrics.microF1,
        "precision_per_label [d_guide -- includes items in this batch]": toJson(
          metrics.precision,
        ),
        "recall_per_label [d_guide -- includes items in this batch]": toJson(
          metrics.recall,
        ),
        "f1_per_label [d_guide -- includes items in this batch]": toJson(
          metrics.f1,
        ),
        "false positive rate per label [d_guide -- includes items in this batch]":
          toJson(metrics.fpr),
        "false negative rate per label [d_guide -- includes items in this batch]":
          toJson(metrics.fnr),
        "expert feedback given": toJson(feedbacks),
        "codebook at the end of the batch": toJson(
          lastSample?.aiAnnotation?.codebookSnapshotBatch ??
            lastSample?.aiAnnotation?.codebookSnapshot ??
            [],
        ),
        "prompt given to lm synthesizer": synthPrompt,
        "time to complete a single batch": Math.round(batchTimeMs / 1000),
      };
    });

    const headerLine = BATCH_HEADERS.map(csvEscape).join(",");
    const dataLines = rows.map((row) =>
      BATCH_HEADERS.map((header) => csvEscape((row as any)[header])).join(","),
    );

    fs.writeFileSync(filePath, [headerLine, ...dataLines].join("\n"), "utf-8");

    return res.status(200).json({
      success: true,
      filename,
    });
  } catch (error: any) {
    console.error("Error generating batch metrics:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate batch metrics",
    });
  }
}

export async function generateCodebookExport(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  const { taskId, codebook } = req.body as {
    taskId?: string;
    codebook?: string[];
  };

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - user not authenticated",
    });
  }

  if (!taskId) {
    return res.status(400).json({
      success: false,
      message: "taskId is required",
    });
  }

  try {
    const taskCollection = getCollection<Task>(
      process.env.TASKS_COLLECTION_NAME || "TaskDetails",
    );
    let taskQueryId: ObjectId | string = taskId;
    if (ObjectId.isValid(taskId)) {
      taskQueryId = new ObjectId(taskId);
    }
    const task = await taskCollection.findOne({
      _id: taskQueryId as any,
      userID: userId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const projectRoot = path.resolve(__dirname, "../../../");
    const promptPath = path.join(
      projectRoot,
      "pybackend",
      "prompts",
      "annotation_task_prompt.md",
    );
    let systemPrompt = "";
    try {
      systemPrompt = await fsAsync.readFile(promptPath, "utf-8");
    } catch (error) {
      console.warn("[metrics] annotation_task_prompt.md not readable:", error);
    }

    const rules = Array.isArray(codebook)
      ? codebook.filter((rule) => typeof rule === "string" && rule.trim())
      : Array.isArray(task.codebook)
        ? task.codebook
        : [];
    const rulesBlock = rules.length
      ? rules.map((rule) => `- ${rule}`).join("\n")
      : "(no rules)";

    const finalPrompt = [
      systemPrompt.trim(),
      "",
      "Task definition:",
      task.description || "",
      "",
      "User input (codebook rules):",
      rulesBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const exportText = [
      `${EXPORT_HEADERS[0]}\n${rulesBlock}`,
      "",
      `${EXPORT_HEADERS[1]}\n${finalPrompt}`,
    ].join("\n");

    ensureCodebookDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "");
    const safeTaskName = (task.name || "task")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "_");
    const filename = `${safeTaskName}_codebook_and_prompt_${timestamp}.txt`;
    const filePath = path.join(CODEBOOK_DIR, filename);

    await fsAsync.writeFile(filePath, exportText, "utf-8");

    return res.status(200).json({
      success: true,
      filename,
    });
  } catch (error: any) {
    console.error("Error generating codebook export:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate codebook export",
    });
  }
}

export async function downloadMetricsFile(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  const filename = req.params.filename;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - user not authenticated",
    });
  }

  if (!filename) {
    return res.status(400).json({
      success: false,
      message: "filename is required",
    });
  }

  try {
    const safeName = path.basename(filename);
    const metricsPath = path.join(METRICS_DIR, safeName);
    const codebookPath = path.join(CODEBOOK_DIR, safeName);

    if (fs.existsSync(metricsPath)) {
      return res.download(metricsPath, safeName);
    }

    if (fs.existsSync(codebookPath)) {
      return res.download(codebookPath, safeName);
    }

    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  } catch (error: any) {
    console.error("Error downloading metrics file:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to download metrics file",
    });
  }
}
