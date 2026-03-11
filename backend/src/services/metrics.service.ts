import fs from "fs";
import path from "path";
import { Response } from "express";
import { AnnotationItem } from "@common/types/annotations";
import { Task } from "@common/types/tasks";
import { getCollection } from "./database.service";
import { ObjectId } from "mongodb";
import { AuthRequest } from "./tasks.service";
import { ensureMetricsDir, METRICS_DIR } from "../utils/metrics";
import Papa from "papaparse";
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
  "guidelines revised",
  "guidelines added",
  "guidelines_deprecated",
  "codebook at the end of this example",
  "time to complete this example (seconds)",
  "user rates LM explanation as useful/correct for determining label",
  "user rates LM span as useful/correct for determining label",
];

const METADATA_HEADERS = [
  "unique_task_id",
  "task_json",
  "labels_json",
  "synthetizer prompt",
  "initial codebook",
  "initial prompt for generating predictions",
  "batch_size",
  "target accuracy",
  "minimum evaluation set size",
  "budget",
  "model specs (full name)",
  "size of dval",
  "distribution of dval",
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
  "macro f1 [dval]",
  "micro f1 [dval]",
  "precision_per_label [dval]",
  "recall_per_label [dval]",
  "f1_per_label [dval]",
  "false positive rate per label [dval]",
  "false negative rate per label [dval]",
  "expert feedback given",
  "guidelines revised",
  "guidelines added",
  "guidelines_deprecated",
  "codebook at the end of the batch after lm synthesizes prompt with new feedback",
  "prompt given to lm synthesizer",
  "time to complete a single batch",
];

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

function getTextData(sample?: Record<string, string>): string {
  if (!sample) return "";
  const combined = sample["text_combined"];
  if (typeof combined === "string" && combined.trim()) {
    return combined.trim();
  }
  const raw = sample["text"];
  if (typeof raw === "string") {
    return raw.trim();
  }
  return "";
}

function formatLabelList(labels?: string[]): string {
  if (!labels || labels.length === 0) return "";
  return labels.join("|");
}

function parseCsvText(csvText: string): Array<Record<string, string>> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (parsed.errors.length > 0) {
    console.warn("[metrics] CSV parse warnings:", parsed.errors);
  }
  return Array.isArray(parsed.data) ? parsed.data : [];
}

function getValLabelDistribution(
  rows: Array<Record<string, string>>,
  labelColumn: string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const raw = row[labelColumn] ?? row.task_label ?? row.taskLabel ?? "";
    const labels = String(raw)
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);
    for (const label of labels) {
      counts[label] = (counts[label] || 0) + 1;
    }
  }
  return counts;
}

function computeLabelMetrics(samples: AnnotationItem[], labelNames: string[]) {
  // Compute per-label TP/FP/FN/TN across the guide batch by comparing
  // model-predicted labels (aiAnnotation.label) vs. reviewer-confirmed labels (sample.labels).
  // Each label is treated one-vs-rest ("label" vs "not label"), so a single sample can
  // contribute FP for one label and FN for another if the predicted label differs from truth.
  const perLabel: Record<
    string,
    { tp: number; fp: number; fn: number; tn: number }
  > = {};
  const totalSamples = samples.length;

  for (const label of labelNames) {
    perLabel[label] = { tp: 0, fp: 0, fn: 0, tn: 0 };
  }

  for (const sample of samples) {
    const predicted = new Set(sample.aiAnnotation?.label || []);
    const truth = new Set(sample.labels || []);
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
    // Standard precision/recall/F1 per label, plus FPR/FNR.
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
  // Micro averages pool TP/FP/FN across all labels first (so frequent labels weigh more).
  // Macro F1 is the simple mean of per-label F1 values (each label weighs equally).
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
    totalSamples,
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
      .find({ taskId, createdBy: userId, source: "guide" })
      .sort({ sampleId: 1 })
      .toArray();

    ensureMetricsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "");
    const filename = `sample_metrics_${taskId}_${timestamp}.csv`;
    const filePath = path.join(METRICS_DIR, filename);

    const rows = annotations.map((annotation) => {
      const ai = annotation.aiAnnotation;
      const isCorrect = ai?.isCorrect ?? null;
      const parsedLabels = formatLabelList(ai?.label);
      const finalLabel =
        isCorrect === true
          ? parsedLabels
          : ai?.correctLabel
            ? ai.correctLabel
            : "";

      return {
        "text data": getTextData(annotation.sampleContent),
        batch_id: ai?.batchID ?? "",
        batch_num: ai?.batchNum ?? "",
        LM_prediction_raw: ai?.predictionRaw ?? "",
        "LM_prediction_parsed (the label)": parsedLabels,
        "label provided by user if user corrects the LM prediction":
          ai?.correctLabel ?? "",
        "correct/incorrect as rated by expert":
          isCorrect === null ? "" : isCorrect ? "correct" : "incorrect",
        "final 'correct' label": finalLabel,
        "guidelines revised": toJson(ai?.guidelinesRevised ?? []),
        "guidelines added": toJson(ai?.guidelinesAdded ?? []),
        guidelines_deprecated: toJson(ai?.guidelinesDeprecated ?? []),
        "codebook at the end of this example": toJson(
          ai?.codebookSnapshot ?? [],
        ),
        "time to complete this example (seconds)":
          ai?.timeToCompleteMs != null
            ? (ai.timeToCompleteMs / 1000).toFixed(3)
            : "",
        "user rates LM explanation as useful/correct for determining label":
          ai?.reasoningFeedback ?? "",
        "user rates LM span as useful/correct for determining label":
          ai?.spanFeedback ?? "",
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

    const projectRoot = path.resolve(__dirname, "../../../");
    const valPath = task.valFile
      ? path.join(projectRoot, "val_datasets", task.valFile)
      : "";
    let valText = "";
    if (valPath) {
      try {
        await fsAsync.access(valPath);
        valText = await fsAsync.readFile(valPath, "utf-8");
      } catch (error) {
        console.warn("[metrics] dval file not readable:", valPath, error);
      }
    }
    const valRows = valText ? parseCsvText(valText) : [];
    const valSize = valRows.length;
    const labelColumn = task.labelColumn || "task_label";
    const distribution = getValLabelDistribution(valRows, labelColumn);

    const rulePromptPath = path.join(
      projectRoot,
      "pybackend",
      "prompts",
      "rule_synthesis_prompt.md",
    );
    const annotationPromptPath = path.join(
      projectRoot,
      "pybackend",
      "prompts",
      "annotation_task_prompt.md",
    );

    const rulePrompt = await fsAsync.readFile(rulePromptPath, "utf-8");
    const annotationPrompt = await fsAsync.readFile(
      annotationPromptPath,
      "utf-8",
    );

    ensureMetricsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "");
    const filename = `metadata_metrics_${taskId}_${timestamp}.csv`;
    const filePath = path.join(METRICS_DIR, filename);

    const row = {
      unique_task_id: taskId,
      task_json: task.taskJsonRaw ?? "",
      labels_json: task.labelsJsonRaw ?? "",
      "synthetizer prompt": rulePrompt,
      "initial codebook": toJson(task.codebook ?? []),
      "initial prompt for generating predictions": annotationPrompt,
      batch_size: 5,
      "target accuracy": "",
      "minimum evaluation set size": "",
      budget: 150,
      "model specs (full name)": task.modelName ?? "",
      "size of dval": valSize,
      "distribution of dval": toJson(distribution),
    };

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
      .find({ taskId, createdBy: userId, source: "guide" })
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
    const synthPrompt = await fsAsync.readFile(promptPath, "utf-8");

    ensureMetricsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "");
    const filename = `batch_metrics_${taskId}_${timestamp}.csv`;
    const filePath = path.join(METRICS_DIR, filename);

    const sortedBatches = Array.from(batches.entries())
      .map(([batchId, items]) => ({
        batchId,
        items,
        minSampleId: Math.min(...items.map((item) => item.sampleId)),
      }))
      .sort((a, b) => a.minSampleId - b.minSampleId);

    const rows = sortedBatches.map((batch, index) => {
      const { batchId, items } = batch;
      const metrics = computeLabelMetrics(items, labelNames);
      const lastSample = items[items.length - 1];
      const batchNum = index + 1;

      const feedbacks = items
        .map((item) => item.aiAnnotation?.feedback)
        .filter((val): val is string => Boolean(val));

      const revised = items.flatMap(
        (item) => item.aiAnnotation?.guidelinesRevised || [],
      );
      const added = items.flatMap(
        (item) => item.aiAnnotation?.guidelinesAdded || [],
      );
      const deprecated = items.flatMap(
        (item) => item.aiAnnotation?.guidelinesDeprecated || [],
      );

      const batchTimeMs = items.reduce(
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
        "macro f1 [dval]": "",
        "micro f1 [dval]": "",
        "precision_per_label [dval]": "",
        "recall_per_label [dval]": "",
        "f1_per_label [dval]": "",
        "false positive rate per label [dval]": "",
        "false negative rate per label [dval]": "",
        "expert feedback given": toJson(feedbacks),
        "guidelines revised": toJson(revised),
        "guidelines added": toJson(added),
        guidelines_deprecated: toJson(deprecated),
        "codebook at the end of the batch after lm synthesizes prompt with new feedback":
          toJson(lastSample?.aiAnnotation?.codebookSnapshot ?? []),
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
    const filePath = path.join(METRICS_DIR, safeName);
    return res.download(filePath, safeName);
  } catch (error: any) {
    console.error("Error downloading metrics file:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to download metrics file",
    });
  }
}
