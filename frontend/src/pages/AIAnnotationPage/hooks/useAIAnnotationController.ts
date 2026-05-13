import { RuleSynthesisItem, RuleSynthesisRequest } from "@common/types/ruleSynthesis";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAITaskData } from "../../../hooks/useAITaskData";
import { toast } from "../../../lib/toast";
import {
  downloadMetricsFile,
  generateBatchMetrics,
  generateMetadataMetrics,
  generateSampleMetrics,
  getValEvalProgress,
  runValEvaluation,
} from "../../../services/metrics.service";
import { ruleSynthesis } from "../../../services/ruleSynthesis.service";
import { exportCodebookSnapshot, saveTaskCodebook } from "../../../services/tasks.service";
import { INTRO_STORAGE_KEY } from "../constants";
import { MetricsFiles } from "../types";
import { getSampleText } from "../utils";
import { useAnnotationReviewFlow } from "./useAnnotationReviewFlow";
import { useCodebookManager } from "./useCodebookManager";
import { useIntroState } from "./useIntroState";
import { useSamplingStatus } from "./useSamplingStatus";

export const useAIAnnotationController = () => {
  const navigate = useNavigate();
  const { loading, task, guideAnnotations, refreshTaskData } = useAITaskData();

  const introState = useIntroState({ storageKey: INTRO_STORAGE_KEY });
  const samplingState = useSamplingStatus({
    taskId: task?._id,
    taskStatus: task?.status,
    refreshTaskData,
  });

  const codebookState = useCodebookManager({ task });

  const reviewState = useAnnotationReviewFlow({
    task,
    guideAnnotations,
    codebook: codebookState.codebook,
    getCodebookSnapshot: codebookState.getCodebookSnapshot,
    setLastPromptUsed: codebookState.setLastPromptUsed,
  });

  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [metricsFiles, setMetricsFiles] = useState<MetricsFiles>({});
  const [isRunningValEval, setIsRunningValEval] = useState(false);
  const [valEvalProgress, setValEvalProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [predictedAccuracy] = useState<number | null>(null);

  const handleDownloadMetrics = async (filename?: string) => {
    if (!filename) return;
    try {
      const blob = await downloadMetricsFile(filename);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download metrics file.");
    }
  };

  const handleCommitBatch = async (): Promise<string[]> => {
    reviewState.setIsLoading(true);
    let committedCodebook = codebookState.codebook;

    try {
      const startIdx = reviewState.currentBatchIndex * reviewState.batchSize;
      const endIdx = startIdx + reviewState.batchSize;

      const batchResultsList = Object.entries(reviewState.batchResults).filter(([idx]) => {
        const i = Number.parseInt(idx, 10);
        return i >= startIdx && i < endIdx;
      });

      const batchCorrect = batchResultsList.filter(([, res]) => res.isCorrect === true).length;
      const batchAttempted = batchResultsList.length;
      setTotalCorrect((prev) => prev + batchCorrect);
      setTotalAttempted((prev) => prev + batchAttempted);

      const ruleSynthesisItems: RuleSynthesisItem[] = batchResultsList
        .filter(([, result]) => {
          return (
            result.isCorrect === false ||
            result.spanFeedback === false ||
            result.reasoningFeedback === false
          );
        })
        .map(([idx, result]) => {
          const i = Number.parseInt(idx, 10);
          const sample = reviewState.annotationsForReview[i]?.sampleContent as
            | Record<string, string>
            | undefined;

          return {
            sample_text: getSampleText(sample, task?.columns?.[0]),
            ai_labels: result.label,
            ai_reasoning: result.reason,
            ai_span_text: result.span_text,
            ground_truth_labels: result.correctLabel
              ? [result.correctLabel]
              : task?.labels.map((item) => item.name) || [],
            user_feedback: result.feedback,
            user_label_feedback: result.isCorrect || false,
            user_span_feedback: result.spanFeedback || true,
            user_reasoning_feedback: result.reasoningFeedback || true,
          };
        });

      let nextCodebook = [...codebookState.codebook];
      if (ruleSynthesisItems.length > 0 && task) {
        const request: RuleSynthesisRequest = {
          payload: ruleSynthesisItems,
          task_type: "rule_synthesis",
          model_name: task.modelName || "mistral:7b",
        };
        const response = await ruleSynthesis(request);
        if (response.success) {
          nextCodebook = [...nextCodebook, ...response.rules];
        }
      }

      nextCodebook = [
        ...nextCodebook.filter((rule) => !codebookState.stagedRulesDeletion.includes(rule)),
        ...codebookState.stagedRules,
      ];

      codebookState.setCodebook(nextCodebook);
      codebookState.setStagedRules([]);
      codebookState.setStagedRulesDeletion([]);
      committedCodebook = nextCodebook;
    } catch (error) {
      console.error("Failed to synthesize rules:", error);
      toast.error("Failed to synthesize new rules for this batch");
    } finally {
      reviewState.setIsLoading(false);
    }

    return committedCodebook;
  };

  const handleNextOrCommit = async () => {
    const shouldGenerateMetrics = reviewState.isLastBatch;
    let committedCodebook: string[] = [];

    if (reviewState.currentBatchProgress === reviewState.actualBatchSize) {
      committedCodebook = await handleCommitBatch();
      if (task?._id) {
        try {
          await saveTaskCodebook(task._id, committedCodebook);
        } catch (error: any) {
          toast.error(error?.message || "Failed to auto-save codebook after batch commit");
        }
      }
    }

    await reviewState.handleNextClick();

    if (shouldGenerateMetrics && task?._id) {
      const [sampleRes, metadataRes, batchRes] = await Promise.all([
        generateSampleMetrics(task._id),
        generateMetadataMetrics(task._id),
        generateBatchMetrics(task._id),
      ]);

      setMetricsFiles({
        sample: sampleRes.filename,
        metadata: metadataRes.filename,
        batch: batchRes.filename,
      });

      try {
        await exportCodebookSnapshot(
          task._id,
          committedCodebook.length > 0 ? committedCodebook : codebookState.codebook,
          codebookState.lastPromptUsed,
        );
      } catch (error: any) {
        console.error("Failed to export codebook:", error);
        toast.error(error?.message || "Failed to export codebook on server");
      }

      setMetricsModalOpen(true);
    }
  };

  const handleRunValEval = async () => {
    if (!task?._id) return;
    setIsRunningValEval(true);
    setValEvalProgress({ completed: 0, total: 0 });

    const taskId = task._id;
    const pollInterval = setInterval(async () => {
      try {
        const progress = await getValEvalProgress(taskId);
        setValEvalProgress({ completed: progress.completed, total: progress.total });
        if (progress.done) clearInterval(pollInterval);
      } catch {
        // ignore transient polling errors
      }
    }, 1500);

    try {
      const res = await runValEvaluation(taskId);
      clearInterval(pollInterval);
      if (res.success && res.filename) {
        setMetricsFiles((prev) => ({
          ...prev,
          valEval: res.filename,
          valEvalPredictions: res.predictionsFilename,
        }));
        toast.success("Val evaluation complete");
      } else {
        toast.error(res.message || "Val evaluation failed");
      }
    } catch {
      clearInterval(pollInterval);
      toast.error("Val evaluation failed");
    } finally {
      setIsRunningValEval(false);
    }
  };

  const goHome = () => navigate("/");

  const isReady = useMemo(
    () => Boolean(task && reviewState.annotationsForReview.length > 0),
    [task, reviewState.annotationsForReview.length],
  );

  return {
    loading,
    task,
    isReady,
    effectiveStatus: samplingState.effectiveStatus,
    samplingErrorMsg: samplingState.samplingErrorMsg,

    ...introState,

    metricsModalOpen,
    metricsFiles,
    setMetricsModalOpen,
    handleDownloadMetrics,
    isRunningValEval,
    valEvalProgress,
    handleRunValEval,

    isLoading: reviewState.isLoading,
    generatedLabels: reviewState.generatedLabels,
    generatedSpanText: reviewState.generatedSpanText,
    generatedReasoning: reviewState.generatedReasoning,
    currentIndex: reviewState.currentIndex,
    totalSamples: reviewState.totalSamples,
    currentSampleText: reviewState.currentSampleText,
    batchResults: reviewState.batchResults,
    spanTextFeedback: reviewState.spanTextFeedback,
    reasoningFeedback: reviewState.reasoningFeedback,

    totalCorrect,
    totalAttempted,
    predictedAccuracy,

    codebook: codebookState.codebook,
    stagedRules: codebookState.stagedRules,
    stagedRulesDeletion: codebookState.stagedRulesDeletion,
    newRule: codebookState.newRule,

    currentBatchProgress: reviewState.currentBatchProgress,
    actualBatchSize: reviewState.actualBatchSize,
    currentBatchStartIndex: reviewState.currentBatchStartIndex,
    isCommitStep: reviewState.currentBatchProgress === reviewState.actualBatchSize,
    nextDisabled: reviewState.nextDisabled,

    handleNextOrCommit,
    goPrev: reviewState.goPrev,
    goHome,

    setCurrentCorrect: reviewState.setCurrentCorrect,
    setSpanTextFeedback: reviewState.setSpanTextFeedback,
    setReasoningFeedback: reviewState.setReasoningFeedback,
    setCurrentCorrectLabel: reviewState.setCurrentCorrectLabel,
    setCurrentFeedback: reviewState.setCurrentFeedback,

    addRule: codebookState.addRule,
    setNewRule: codebookState.setNewRule,
    handleExportCodebook: codebookState.handleExportCodebook,
    editRule: codebookState.editRule,
    toggleDeleteRule: codebookState.toggleDeleteRule,
    removeStagedRule: codebookState.removeStagedRule,
  };
};
