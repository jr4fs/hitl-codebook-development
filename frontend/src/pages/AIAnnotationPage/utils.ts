import { AIAssisted, CsvRow } from "./types";

export const toSafeFilename = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

export const diffCodebook = (start: string[], end: string[]) => {
  const added = end.filter((rule) => !start.includes(rule));
  const deprecated = start.filter((rule) => !end.includes(rule));
  const revised: Array<{ from: string; to: string }> = [];
  const minLen = Math.min(start.length, end.length);

  for (let i = 0; i < minLen; i += 1) {
    if (start[i] && end[i] && start[i] !== end[i]) {
      revised.push({ from: start[i], to: end[i] });
    }
  }

  return { added, deprecated, revised };
};

export const getSampleText = (
  sample?: CsvRow | null,
  preferredColumn?: string,
): string => {
  if (!sample) return "";

  const combined = sample.text_combined;
  if (typeof combined === "string" && combined.trim()) {
    return combined.trim();
  }

  if (preferredColumn && typeof sample[preferredColumn] === "string") {
    const preferredText = sample[preferredColumn].trim();
    if (preferredText) return preferredText;
  }

  const rawText = sample.text;
  if (typeof rawText === "string" && rawText.trim()) {
    return rawText.trim();
  }

  for (const value of Object.values(sample)) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

export const isFeedbackComplete = (ai?: AIAssisted | null) => {
  if (!ai) return false;
  if (ai.isCorrect === null) return false;
  if (ai.spanFeedback === null || ai.reasoningFeedback === null) return false;
  if (ai.isCorrect === false) {
    return Boolean(ai.correctLabel && ai.feedback?.trim());
  }
  return true;
};

export const normalizeAI = (
  ai: Partial<AIAssisted> | null | undefined,
  taskId?: string | null,
): AIAssisted => ({
  taskID: ai?.taskID ?? taskId ?? null,
  batchID: ai?.batchID ?? null,
  batchNum: ai?.batchNum ?? null,
  label: Array.isArray(ai?.label) ? ai.label : [],
  reason: ai?.reason ?? "",
  span_text: ai?.span_text ?? "",
  isCorrect: ai?.isCorrect ?? null,
  feedback: ai?.feedback ?? "",
  spanFeedback: ai?.spanFeedback ?? null,
  reasoningFeedback: ai?.reasoningFeedback ?? null,
  correctLabel: ai?.correctLabel ?? null,
  predictionRaw: ai?.predictionRaw ?? null,
  timeToCompleteMs: ai?.timeToCompleteMs ?? null,
  codebookSnapshot: Array.isArray(ai?.codebookSnapshot) ? ai.codebookSnapshot : [],
  guidelinesAdded: Array.isArray(ai?.guidelinesAdded) ? ai.guidelinesAdded : [],
  guidelinesDeprecated: Array.isArray(ai?.guidelinesDeprecated)
    ? ai.guidelinesDeprecated
    : [],
  guidelinesRevised: Array.isArray(ai?.guidelinesRevised) ? ai.guidelinesRevised : [],
});

export const hasFeedbackChanged = (
  existing: AIAssisted | null,
  next: AIAssisted,
  existingLabels: string[],
  nextLabels: string[],
) => {
  if (!existing) return true;
  if (existing.isCorrect !== next.isCorrect) return true;
  if ((existing.feedback || "").trim() !== (next.feedback || "").trim()) return true;
  if ((existing.correctLabel || null) !== (next.correctLabel || null)) return true;
  if ((existing.spanFeedback ?? null) !== (next.spanFeedback ?? null)) return true;
  if ((existing.reasoningFeedback ?? null) !== (next.reasoningFeedback ?? null)) return true;
  return JSON.stringify(existingLabels || []) !== JSON.stringify(nextLabels || []);
};

export const buildCodebookExportContent = (codebook: string[], lastPromptUsed: string) => {
  const codebookText = codebook.map((rule) => `- ${rule}`).join("\n");
  return ["## CODEBOOK ##", codebookText, "", "## LAST PROMPT ##", lastPromptUsed || "", ""].join(
    "\n",
  );
};
