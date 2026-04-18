import {
  Text,
  Paper,
  Title,
  Group,
  Button,
  Textarea,
  Stack,
  ScrollArea,
  LoadingOverlay,
  Loader,
  Center,
  Box,
  Grid,
  Divider,
  Badge,
  ActionIcon,
  Tooltip,
  Modal,
  Checkbox,
  Select,
  useMantineColorScheme,
} from "@mantine/core";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { inference } from "../services/inference.service";
import {
  RuleSynthesisItem,
  RuleSynthesisRequest,
} from "@common/types/ruleSynthesis";
import { useAITaskData } from "../hooks/useAITaskData";
import { ruleSynthesis } from "../services/ruleSynthesis.service";
import {
  IconCheck,
  IconX,
  IconArrowLeft,
  IconArrowRight,
  IconBook,
  IconPlus,
  IconTrash,
  IconEdit,
  IconInfoCircle,
  IconThumbUp,
  IconThumbDown,
} from "@tabler/icons-react";
import { InferenceRequest, InferenceResponse } from "@common/types/inference";
import StepTrackerBanner from "../components/StepTrackerBanner";
import { updateGuideAnnotation } from "../services/annotations.service";
import {
  saveTaskCodebook,
  exportCodebookSnapshot,
} from "../services/tasks.service";
import {
  generateSampleMetrics,
  generateMetadataMetrics,
  generateBatchMetrics,
  downloadMetricsFile,
} from "../services/metrics.service";
import { toast } from "../lib/toast";
import { v4 as uuidv4 } from "uuid";
import { getTaskById } from "../services/tasks.service";

interface CsvRow {
  [key: string]: string;
}

export default function AnnotationPage() {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const isLight = colorScheme === "light";
  const mutedColor = isLight ? "#3b4750" : "dimmed";
  const surface = isLight ? "#ffffff" : "var(--app-surface)";
  const surface2 = isLight ? "#f4f7f9" : "var(--app-surface-2)";
  const surface3 = isLight ? "#eef3f5" : "var(--app-surface-3)";
  const panelBg = isLight ? "#f2f6f8" : "var(--app-panel)";
  const borderColor = isLight ? "rgba(15, 20, 24, 0.12)" : "var(--app-border)";
  const borderStrong = isLight
    ? "rgba(15, 20, 24, 0.18)"
    : "var(--app-border-strong)";
  const { loading, task, guideAnnotations, refreshTaskData } = useAITaskData();
  const [samplingStatus, setSamplingStatus] = useState<
    "sampling_pending" | "ready" | "sampling_error" | null
  >(null);
  const [samplingErrorMsg, setSamplingErrorMsg] = useState<string | null>(null);
  const samplingNotifiedRef = useRef(false);
  console.log("guide annotations length: ", guideAnnotations.length);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedLabels, setGeneratedLabels] = useState<string[]>([
    "Click next to generate this content",
  ]);
  const [generatedSpanText, setGeneratedSpanText] = useState<string>(
    "Click next to generate this content",
  );
  const [generatedReasoning, setGeneratedReasoning] = useState<string>(
    "Click next to generate this content",
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const batchSize = 5;
  const currentBatchIndex = Math.floor(currentIndex / batchSize);
  const [currentBatchUUID, setCurrentBatchUUID] = useState<string>("");

  // Performance Metrics State
  const [totalCorrect, setTotalCorrect] = useState<number>(0);
  const [totalAttempted, setTotalAttempted] = useState<number>(0);
  const [predictedAccuracy] = useState<number | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [introDontShow, setIntroDontShow] = useState(false);
  const [introShowCheckbox, setIntroShowCheckbox] = useState(true);
  const [isSavingCodebook, setIsSavingCodebook] = useState(false);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [metricsFiles, setMetricsFiles] = useState<{
    sample?: string;
    metadata?: string;
    batch?: string;
  }>({});

  // Codebook State
  const [codebook, setCodebook] = useState<string[]>([]);
  const [lastPromptUsed, setLastPromptUsed] = useState<string>("");
  const [newRule, setNewRule] = useState("");
  // manual rules queue
  const [stagedRules, setStagedRules] = useState<string[]>([]);
  const [stagedRulesDeletion, setStagedRulesDeletion] = useState<string[]>([]);

  // generated span text feedback
  const [spanTextFeedback, setSpanTextFeedback] = useState<boolean>();
  // generated reasoning  text feedback
  const [reasoningFeedback, setReasoningFeedback] = useState<boolean>();

  interface AIAssisted {
    taskID: string | null;
    batchID: string | null;
    batchNum: number | null;
    label: string[];
    reason: string;
    span_text: string;
    isCorrect: boolean | null;
    feedback: string;
    spanFeedback: boolean | null;
    reasoningFeedback: boolean | null;
    correctLabel: string | null;
    predictionRaw: string | null;
    timeToCompleteMs: number | null;
    codebookSnapshot: string[];
    guidelinesAdded: string[];
    guidelinesDeprecated: string[];
    guidelinesRevised: Array<{ from: string; to: string }>;
  }

  // Annotation States for current batch
  const [batchResults, setBatchResults] = useState<Record<number, AIAssisted>>(
    {},
  );
  const sampleStartsRef = useRef<
    Record<number, { startedAt: number; codebook: string[] }>
  >({});
  const skipInferenceRef = useRef(false);

  const resetAISuggestion = () => {
    setGeneratedLabels(["Generating suggestion..."]);
    setGeneratedSpanText("Generating span text...");
    setGeneratedReasoning("Generating reasoning...");
  };

  // useEffect(() => {
  //   if (annotations && annotations.length > 0) {
  //     setFallbackAnnotations([]);
  //     return;
  //   }

  //   if (!task?._id || !guideData || guideData.length === 0) {
  //     return;
  //   }

  //   if (fallbackAnnotations.length > 0) {
  //     return;
  //   }

  //   const sample = guideData.slice(0, Math.min(20, guideData.length));
  //   const generated = sample.map((row, idx) => {
  //     const textValue = String(row.text || "");
  //     return {
  //       taskId: task._id as string,
  //       sampleId: idx + 1,
  //       sampleContent: {
  //         ...row,
  //         text_combined: textValue,
  //       } as Record<string, string>,
  //       labels: [],
  //       createdBy: "system",
  //       createdAt: new Date().toISOString(),
  //     } as AnnotationItem;
  //   });

  //   setFallbackAnnotations(generated);
  // }, [annotations, guideData, task?._id, fallbackAnnotations.length]);

  const annotationsForReview =
    guideAnnotations && guideAnnotations.length > 0 ? guideAnnotations : [];

  // Persist the 10/90 split in localStorage so a page refresh restores the same
  // partition. Keyed by taskId to avoid cross-task collisions.
  // useEffect(() => {
  //   if (!annotationsForReview.length || !task?._id || workingSamples) return;

  //   if (annotations && annotations.length > 0) {
  //     const storageKey = `workingSamples_${task._id}`;
  //     const stored = localStorage.getItem(storageKey);

  //     if (stored) {
  //       try {
  //         setWorkingSamples(JSON.parse(stored));
  //         return;
  //       } catch {
  //         localStorage.removeItem(storageKey);
  //       }
  //     }

  //     setWorkingSamples(null);
  //     return;
  //   }

  //   setWorkingSamples(null);
  // }, [annotations, annotationsForReview, task, workingSamples]);

  const generateBatchUUID = () => {
    const UUID: string = uuidv4();
    console.log(`batch number:${currentBatchIndex}, assigned UUID: ${UUID}`);
    return UUID;
  };

  useEffect(() => {
    setCurrentBatchUUID(generateBatchUUID());
  }, [currentBatchIndex]);

  useEffect(() => {
    setSamplingStatus(
      (task?.status as "sampling_pending" | "ready" | "sampling_error") ?? null,
    );
  }, [task?.status]);

  useEffect(() => {
    if (!task?._id) return;
    const currentStatus =
      samplingStatus ??
      (task.status as "sampling_pending" | "ready" | "sampling_error" | undefined);
    if (currentStatus === "ready" || currentStatus === "sampling_error") return;

    let mounted = true;
    const pollStatus = async () => {
      try {
        const response = await getTaskById(task._id as string);
        const latestStatus = (response.task?.status ??
          "sampling_pending") as "sampling_pending" | "ready" | "sampling_error";
        if (!mounted) return;
        setSamplingStatus(latestStatus);

        if (latestStatus === "ready") {
          await refreshTaskData();
          window.dispatchEvent(new Event("tasks:updated"));
          if (!samplingNotifiedRef.current) {
            toast.success("Sampling completed. Task is ready.");
            samplingNotifiedRef.current = true;
          }
        } else if (latestStatus === "sampling_error") {
          setSamplingErrorMsg(
            "Sampling failed in the backend. Please retry task creation or check backend logs.",
          );
          if (!samplingNotifiedRef.current) {
            toast.error("Sampling failed for this task.");
            samplingNotifiedRef.current = true;
          }
        }
      } catch (error) {
        console.error("Failed to poll task status:", error);
      }
    };

    void pollStatus();
    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, 60_000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [task?._id, task?.status, samplingStatus, refreshTaskData]);

  useEffect(() => {
    if (task?.codebook && task.codebook.length > 0 && codebook.length === 0) {
      setCodebook(task.codebook);
    }
  }, [task, codebook.length]);

  const getCodebookSnapshot = () => [...codebook, ...stagedRules];

  const toSafeFilename = (value: string) =>
    value
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

  const handleExportCodebook = () => {
    if (!task?.name) return;
    const name = toSafeFilename(task.name) || "task";
    const filename = `${name}_codebook_and_prompt.txt`;
    const codebookText = getCodebookSnapshot()
      .map((rule) => `- ${rule}`)
      .join("\n");
    const content = [
      "## CODEBOOK ##",
      codebookText,
      "",
      "## LAST PROMPT ##",
      lastPromptUsed || "",
      "",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const diffCodebook = (start: string[], end: string[]) => {
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

  const getSampleText = (sample?: CsvRow | null) => {
    if (!sample) return "";
    const combined = sample["text_combined"];
    if (typeof combined === "string" && combined.trim()) {
      return combined.trim();
    }
    const preferredCol = task?.columns?.[0];
    if (preferredCol && typeof sample[preferredCol] === "string") {
      const preferredText = sample[preferredCol].trim();
      if (preferredText) return preferredText;
    }
    const rawText = sample["text"];
    if (typeof rawText === "string") {
      return rawText.trim();
    }
    for (const value of Object.values(sample)) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  };

  const handleClickAnnotation = async (): Promise<boolean> => {
    if (!currentSample) return false;
    const finalText = getSampleText(currentSample);
    if (!finalText) {
      console.warn("No text available for inference.");
      return false;
    }
    setIsLoading(true);
    const payload: InferenceRequest = {
      labels: task?.labels || [],
      task_definition: task?.description || "",
      case_notes: finalText,
      model_name: task?.modelName || "mistral:7b",
      task_type: "annotation",
      user_input: codebook.join("\n"), // Rules synthesized by an LLM and the user's rules
    };

    // setting llm responses (predicted labels, span text and reasoning)
    try {
      const response: InferenceResponse = await inference(payload);
      if (response) {
        console.log("Annotation Response: ", response);
        sampleStartsRef.current[currentIndex] = {
          startedAt: Date.now(),
          codebook: getCodebookSnapshot(),
        };
        setBatchResults((sample: Record<number, AIAssisted>) => ({
          ...sample,
          [currentIndex]: {
            taskID: task?._id ?? null,
            batchID: currentBatchUUID,
            batchNum: currentBatchIndex + 1,
            label: response.label,
            reason: response.reason,
            span_text: response.span_text,
            isCorrect: sample[currentIndex]?.isCorrect ?? null,
            feedback: sample[currentIndex]?.feedback ?? "",
            spanFeedback: spanTextFeedback ?? null,
            reasoningFeedback: reasoningFeedback ?? null,
            correctLabel: sample[currentIndex]?.correctLabel ?? null,
            predictionRaw: response.raw_response ?? null,
            timeToCompleteMs: sample[currentIndex]?.timeToCompleteMs ?? null,
            codebookSnapshot: sample[currentIndex]?.codebookSnapshot ?? [],
            guidelinesAdded: sample[currentIndex]?.guidelinesAdded ?? [],
            guidelinesDeprecated:
              sample[currentIndex]?.guidelinesDeprecated ?? [],
            guidelinesRevised: sample[currentIndex]?.guidelinesRevised ?? [],
          },
        }));
        setGeneratedLabels(response.label);
        setGeneratedSpanText(response.span_text);
        setGeneratedReasoning(response.reason);
        if (response.system_prompt || response.user_prompt) {
          const systemPrompt = response.system_prompt || "";
          const userPrompt = response.user_prompt || "";
          setLastPromptUsed(`${systemPrompt}\n\n${userPrompt}`.trim());
        }
        return true;
      }
      toast.error("Something went wrong, please try again");
      return false;
    } catch (error) {
      console.error("Inference failed:", error);
      toast.error("Something went wrong, please try again");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger inference whenever the index changes or when samples first become available.
  useEffect(() => {
    if (
      !annotationsForReview.length ||
      currentIndex >= annotationsForReview.length
    ) {
      return;
    }
    if (skipInferenceRef.current) {
      skipInferenceRef.current = false;
      return;
    }
    resetAISuggestion();
    setSpanTextFeedback(undefined);
    setReasoningFeedback(undefined);
    const runInference = async () => {
      const ok = await handleClickAnnotation();
      if (!ok && currentIndex > 0) {
        skipInferenceRef.current = true;
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    runInference();
  }, [currentIndex, annotationsForReview.length]);

  useEffect(() => {
    const hideIntro = localStorage.getItem("hideStep5Intro") === "true";
    if (!hideIntro) {
      setIntroShowCheckbox(true);
      setIntroOpen(true);
    }
  }, []);

  const handleCloseIntro = () => {
    if (introShowCheckbox && introDontShow) {
      localStorage.setItem("hideStep5Intro", "true");
    }
    setIntroOpen(false);
  };

  const handleHelp = () => {
    setIntroShowCheckbox(false);
    setIntroOpen(true);
  };

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
    } catch (error) {
      toast.error("Failed to download metrics file.");
    }
  };

  const infoIcon = (label: string) => (
    <Tooltip label={label} withArrow position="right">
      <ActionIcon size="xs" variant="subtle" color="gray" aria-label={label}>
        <IconInfoCircle size={14} />
      </ActionIcon>
    </Tooltip>
  );

  const currentAnnotation =
    annotationsForReview.length > 0 && currentIndex > -1
      ? annotationsForReview[currentIndex]
      : null;
  const currentSample = currentAnnotation?.sampleContent ?? null;

  const totalSamples = annotationsForReview.length;

  const actualBatchSize = Math.min(
    batchSize,
    totalSamples - Math.floor(currentIndex / batchSize) * batchSize,
  );

  const renderPageLoadingOverlay = (message: string) => (
    <Box
      mih="100dvh"
      bg={isLight ? "#f7fafb" : "var(--app-bg)"}
      style={{ position: "relative" }}
    >
      <LoadingOverlay
        visible
        zIndex={1}
        overlayProps={{
          blur: 2,
          color: isLight ? "#f7fafb" : "#0f1418",
          opacity: isLight ? 0.78 : 0.72,
        }}
        loaderProps={{
          children: (
            <Stack align="center" gap="xs">
              <Loader color={isLight ? "blue" : "cyan"} />
              <Text c={isLight ? "#0f1418" : "white"} fw={500} ta="center">
                {message}
              </Text>
            </Stack>
          ),
        }}
      />
    </Box>
  );

  if (loading) {
    return renderPageLoadingOverlay("Loading annotation data...");
  }

  const effectiveStatus =
    samplingStatus ??
    (task?.status as "sampling_pending" | "ready" | "sampling_error" | undefined);

  if (effectiveStatus === "sampling_pending") {
    return renderPageLoadingOverlay(
      "Task created. Sampling is in progress. This page checks status once every minute.",
    );
  }

  if (effectiveStatus === "sampling_error") {
    return (
      <Center h="100vh" bg="var(--app-bg)">
        <Stack align="center" gap="md">
          <Text c={isLight ? "#0f1418" : "white"}>
            {samplingErrorMsg || "Sampling failed for this task."}
          </Text>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </Stack>
      </Center>
    );
  }

  if (!task || annotationsForReview.length === 0) {
    return (
      <Center h="100vh" bg="var(--app-bg)">
        <Stack align="center" gap="md">
          <Text c={isLight ? "#0f1418" : "white"}>
            No data available for annotation
          </Text>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </Stack>
      </Center>
    );
  }

  const totalBatches = Math.ceil(totalSamples / batchSize);
  const currentBatchProgress = (currentIndex % batchSize) + 1;
  const isLastBatch =
    currentBatchIndex === totalBatches - 1 &&
    currentBatchProgress === actualBatchSize;

  const addRule = () => {
    if (newRule.trim()) {
      setStagedRules([...stagedRules, newRule.trim()]);
      setNewRule("");
    }
  };

  const handleNextClick = async () => {
    try {
      const currentAIResult = batchResults[currentIndex];
      if (currentAIResult && task?._id && currentSample && currentAnnotation) {
        const startSnapshot = sampleStartsRef.current[currentIndex];
        const endCodebook = getCodebookSnapshot();
        const { added, deprecated, revised } = diffCodebook(
          startSnapshot?.codebook ?? [],
          endCodebook,
        );
        const timeToCompleteMs = startSnapshot
          ? Date.now() - startSnapshot.startedAt
          : null;
        const enrichedAIResult: AIAssisted = {
          ...currentAIResult,
          batchNum: currentAIResult.batchNum ?? currentBatchIndex + 1,
          timeToCompleteMs,
          spanFeedback: spanTextFeedback ?? null,
          reasoningFeedback: reasoningFeedback ?? null,
          codebookSnapshot: endCodebook,
          guidelinesAdded: added,
          guidelinesDeprecated: deprecated,
          guidelinesRevised: revised,
        };
        const resolvedLabels =
          enrichedAIResult.isCorrect === false && enrichedAIResult.correctLabel
            ? [enrichedAIResult.correctLabel]
            : enrichedAIResult.label;
        setBatchResults((prev) => ({
          ...prev,
          [currentIndex]: enrichedAIResult,
        }));
        await updateGuideAnnotation({
          taskId: task._id,
          sampleId: currentAnnotation.sampleId,
          sampleContent: currentSample as Record<string, string>,
          source: "guide",
          labels: resolvedLabels,
          aiAnnotation: enrichedAIResult,
        });
      }
    } catch (error) {
      console.error("Failed to update guide annotation:", error);
      toast.error("Failed to save annotation feedback.");
    }

    if (currentIndex < totalSamples - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(totalSamples);
    }
  };

  const handleCommitBatch = async (): Promise<string[]> => {
    setIsLoading(true);
    let committedCodebook = codebook;
    try {
      const startIdx = currentBatchIndex * batchSize;
      const endIdx = startIdx + batchSize;

      // Calculate batch metrics before synthesis
      const batchResultsList = Object.entries(batchResults).filter(([idx]) => {
        const i = parseInt(idx);
        return i >= startIdx && i < endIdx;
      });

      const batchCorrect = batchResultsList.filter(
        ([_, res]) => res.isCorrect === true,
      ).length;
      const batchAttempted = batchResultsList.length;

      setTotalCorrect((prev) => prev + batchCorrect);
      setTotalAttempted((prev) => prev + batchAttempted);

      const rule_synthesis_items: RuleSynthesisItem[] = batchResultsList
        .filter(
          ([_, result]) =>
            result.isCorrect === false ||
            result.spanFeedback === false ||
            result.reasoningFeedback === false,
        ) // Only pick incorrect annotations
        .map(([idx, result]) => {
          const i = parseInt(idx);
          const sample = annotationsForReview[i]?.sampleContent as
            | CsvRow
            | undefined;
          // Create rule synthesis item
          return {
            sample_text: getSampleText(sample),
            ai_labels: result.label,
            ai_reasoning: result.reason,
            ai_span_text: result.span_text,
            ground_truth_labels: result.correctLabel
              ? [result.correctLabel]
              : task.labels.map((item) => item.name),
            user_feedback: result.feedback, // The actual string from the textarea,
            user_label_feedback: result.isCorrect || false,
            user_span_feedback: result.spanFeedback || true,
            user_reasoning_feedback: result.reasoningFeedback || true,
          };
        });

      // Only perform rule synthesis if there are any incorrect model annotations
      let nextCodebook = [...codebook];
      if (rule_synthesis_items.length > 0) {
        const request: RuleSynthesisRequest = {
          payload: rule_synthesis_items,
          task_type: "rule_synthesis",
          model_name: task.modelName || "mistral:7b",
        };
        const response = await ruleSynthesis(request);

        if (response.success) {
          // Append new rules to the live codebook
          nextCodebook = [...nextCodebook, ...response.rules];
        }
      }
      nextCodebook = [
        ...nextCodebook.filter((rule) => !stagedRulesDeletion.includes(rule)),
        ...stagedRules,
      ];
      setCodebook(nextCodebook);
      console.log("staged before: ",stagedRules);
      setStagedRules([]);
      console.log("staged after: ",stagedRules);
      console.log("deletion before: ",stagedRulesDeletion);
      setStagedRulesDeletion([]);
      console.log("deletion after: ",stagedRulesDeletion);
      committedCodebook = nextCodebook;
    } catch (error: any) {
      console.error("Failed to synthesize rules:", error);
      toast.error("Failed to synthesize new rules for this batch");
    } finally {
      setIsLoading(false);
    }
    return committedCodebook;
  };

  // const handleBatchInferenceClick = async () => {
  //   if (!workingSamples?.ninetyPercent.length || !task) return;
  //   //setIsLoading(true);
  //   try {
  //     const payload: BatchInferenceRequest[] = workingSamples.ninetyPercent.map(
  //       (sample) => ({
  //         labels: task.labels,
  //         task_definition: task.description || "",
  //         case_notes: getSampleText(sample),
  //         model_name: "mistral:7b",
  //         task_type: "annotation",
  //         user_input: codebook.join("\n"),
  //         ground_truth_labels: (sample.labels || []).map((labelName) => {
  //           const taskLabel = task.labels.find((l) => l.name === labelName);
  //           return (
  //             taskLabel || { name: labelName, definition: "", keywords: [] }
  //           );
  //         }),
  //       }),
  //     );

  //     const summary = await batchInference(payload);
  //     if (summary) {
  //       setPredictedAccuracy(summary.accuracy);
  //     }
  //   } catch (error) {
  //     console.error("Batch evaluation failed:", error);
  //   } finally {
  //     //setIsLoading(false);
  //   }
  // };

  const handleSaveCodebook = async () => {
    if (!task?._id || isSavingCodebook) return;
    setIsSavingCodebook(true);
    try {
      const response = await saveTaskCodebook(task._id, codebook);

      if (response.success) {
        toast.success("Codebook saved");
      } else {
        toast.error(response.message || "Failed to save codebook");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save codebook");
    } finally {
      setIsSavingCodebook(false);
    }
  };

  return (
    <Box
      mih="100vh"
      bg={isLight ? "#f7fafb" : "var(--app-bg)"}
      c={isLight ? "#0f1418" : "var(--app-text)"}
    >
      <Stack mih="100vh" gap="md" p="xl">
        <Modal
          opened={metricsModalOpen}
          onClose={() => setMetricsModalOpen(false)}
          centered
          size="lg"
          title="Review complete"
          overlayProps={{
            blur: 2,
            opacity: 0.5,
            color: isLight ? "#f7fafb" : "#11171c",
          }}
          styles={{
            content: {
              backgroundColor: isLight ? "#ffffff" : "rgba(20, 28, 34, 0.98)",
              border: isLight
                ? "1px solid rgba(15, 20, 24, 0.12)"
                : "1px solid rgba(124, 231, 225, 0.25)",
              boxShadow: isLight
                ? "0 24px 60px rgba(0, 0, 0, 0.15)"
                : "0 24px 60px rgba(0, 0, 0, 0.35)",
              color: isLight ? "#0f1418" : "#e8eef1",
            },
            header: { backgroundColor: "transparent" },
            title: { color: isLight ? "#0f1418" : "#e8eef1", fontWeight: 600 },
            close: { color: isLight ? "#0f1418" : "#e8eef1" },
          }}
        >
          <Stack gap="sm">
            <Text>
              Review completed! You can download the captured metrics below.
            </Text>
            <Button
              fullWidth
              variant="light"
              onClick={() => handleDownloadMetrics(metricsFiles.sample)}
              disabled={!metricsFiles.sample}
            >
              Download sample metrics
            </Button>
            <Button
              fullWidth
              variant="light"
              onClick={() => handleDownloadMetrics(metricsFiles.batch)}
              disabled={!metricsFiles.batch}
            >
              Download batch metrics
            </Button>
            <Button
              fullWidth
              variant="light"
              onClick={() => handleDownloadMetrics(metricsFiles.metadata)}
              disabled={!metricsFiles.metadata}
            >
              Download metadata metrics
            </Button>
          </Stack>
        </Modal>
        <Modal
          opened={introOpen}
          onClose={handleCloseIntro}
          centered
          title="Step 2: AI annotation review"
          overlayProps={{
            blur: 2,
            opacity: 0.5,
            color: isLight ? "#f7fafb" : "#11171c",
          }}
          styles={{
            content: {
              backgroundColor: isLight ? "#ffffff" : "rgba(20, 28, 34, 0.98)",
              border: isLight
                ? "1px solid rgba(15, 20, 24, 0.12)"
                : "1px solid rgba(124, 231, 225, 0.25)",
              boxShadow: isLight
                ? "0 24px 60px rgba(0, 0, 0, 0.15)"
                : "0 24px 60px rgba(0, 0, 0, 0.35)",
              color: isLight ? "#0f1418" : "#e8eef1",
            },
            header: { backgroundColor: "transparent" },
            title: { color: isLight ? "#0f1418" : "#e8eef1", fontWeight: 600 },
            close: { color: isLight ? "#0f1418" : "#e8eef1" },
          }}
        >
          <Stack gap="sm">
            <Text>
              Review AI suggestions, mark them correct or incorrect, and add
              feedback to refine the live codebook. This step prepares the final
              guidance.
            </Text>
            {introShowCheckbox && (
              <Checkbox
                label="Don't show again"
                checked={introDontShow}
                onChange={(event) =>
                  setIntroDontShow(event.currentTarget.checked)
                }
              />
            )}
            <Group justify="flex-end">
              <Button onClick={handleCloseIntro}>Got it</Button>
            </Group>
          </Stack>
        </Modal>
        <StepTrackerBanner
          currentStep={2}
          activeSteps={[2]}
          onHelp={handleHelp}
        />
        <Grid gutter={0} style={{ flex: 1, minHeight: 0 }}>
          {/* Main Annotation Area */}
          <Grid.Col
            span={8}
            h="100%"
            style={{ borderRight: `1px solid ${borderColor}` }}
          >
            <Stack h="100%" p="xl" gap="md">
              {/* Header / Batch Ribbon */}
              <Group justify="space-between">
                <Group gap="sm">
                  <Stack gap={0}>
                    <Title order={3} c={isLight ? "#0f1418" : "white"}>
                      AI Assisted Annotation
                    </Title>
                    <Text size="xs" c={mutedColor}>
                      Task: {task.name}
                    </Text>
                    <Text size="xs" c={mutedColor}>
                      {task.description}
                    </Text>
                  </Stack>

                  <Group gap="xs" ml="xs">
                    <Tooltip
                      label={`Current Accuracy: ${totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0}% (${totalCorrect}/${totalAttempted})`}
                    >
                      <Badge
                        variant="filled"
                        color={
                          totalAttempted === 0
                            ? "gray"
                            : totalCorrect / totalAttempted > 0.8
                              ? "green"
                              : "orange"
                        }
                        size="xl"
                        fz="xs"
                        circle
                        style={{ border: `1px solid ${borderColor}` }}
                      >
                        {totalAttempted > 0
                          ? Math.round((totalCorrect / totalAttempted) * 100)
                          : "—"}
                      </Badge>
                    </Tooltip>
                    <Tooltip label="Unseen Data Accuracy (Predicted)">
                      <Badge
                        variant="outline"
                        color={
                          predictedAccuracy === null
                            ? "gray"
                            : predictedAccuracy > 0.8
                              ? "green"
                              : "orange"
                        }
                        size="xl"
                        fz="xs"
                        circle
                        style={{ border: `1px solid ${borderColor}` }}
                      >
                        {predictedAccuracy === null
                          ? "—"
                          : Math.round(predictedAccuracy * 100)}
                      </Badge>
                    </Tooltip>
                  </Group>
                </Group>
                <Group gap="xs" align="center">
                  {Array.from({ length: Math.min(totalBatches, 5) }).map(
                    (_, i) => (
                      <Badge
                        key={i}
                        variant={i === currentBatchIndex ? "filled" : "outline"}
                        color={i < currentBatchIndex ? "green" : "gray"}
                        size="lg"
                        style={{ cursor: "pointer" }}
                      >
                        Batch {i + 1}
                      </Badge>
                    ),
                  )}
                  {infoIcon(
                    "Batch groups reviewed samples to build the live codebook.",
                  )}
                  {totalBatches > 5 && (
                    <Text size="xs" c={mutedColor}>
                      ...
                    </Text>
                  )}
                </Group>
              </Group>

              <Divider color={borderColor} />

              {/* Progress in Batch */}
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Batch Progress: {currentBatchProgress} / {actualBatchSize}
                </Text>
                <Text size="sm" c={mutedColor}>
                  Overall: {currentIndex + 1} / {totalSamples}
                </Text>
              </Group>

              <Text size="sm" fw={600} c={isLight ? "#0f1418" : "white"}>
                Final Text
              </Text>
              <Paper
                bg={surface}
                p="md"
                radius="md"
                style={{ border: `1px solid ${borderColor}`, flex: 1 }}
              >
                <ScrollArea h="150">
                  <Text size="lg" style={{ whiteSpace: "pre-wrap" }}>
                    {getSampleText(currentSample) || "No text available"}
                  </Text>
                </ScrollArea>
              </Paper>

              {/* AI Output Section */}
              <Paper
                bg={surface2}
                p="md"
                radius="md"
                style={{ border: `1px solid ${borderStrong}`, position: "relative" }}
              >
                <LoadingOverlay
                  visible={isLoading}
                  overlayProps={{ blur: 1 }}
                />
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Group gap={6} align="center">
                      <Title order={5} c={isLight ? "#0f1418" : "white"}>
                        AI Suggestion
                      </Title>
                      {infoIcon("The model's proposed labels and rationale.")}
                    </Group>
                  </Group>

                  <Group gap="sm">
                    <Text fw={700}>Labels:</Text>
                    {generatedLabels.map((label) => (
                      <Badge size="lg" variant="filled" color="green">
                        {label || "..."}
                      </Badge>
                    ))}
                  </Group>

                  <Stack gap={4}>
                    <Group gap={6} align="center">
                      <Text fw={700} size="sm">
                        Span Text:
                      </Text>
                      {infoIcon(
                        "Key text span the model used to justify the label.",
                      )}
                    </Group>
                    <Group gap="sm" align="flex-start" wrap="nowrap" w="100%">
                      <Text
                        size="sm"
                        bg={isLight ? "#e6ecf0" : "var(--app-chip)"}
                        p="xs"
                        style={{ flex: 1, borderRadius: "4px" }}
                      >
                        {generatedSpanText || "..."}
                      </Text>
                      <Group gap="xs" style={{ flexShrink: 0 }}>
                        <ActionIcon
                          size="md"
                          variant={
                            spanTextFeedback === true ? "filled" : "light"
                          }
                          color="green"
                          onClick={() => setSpanTextFeedback(true)}
                        >
                          <IconThumbUp size={18} />
                        </ActionIcon>
                        <ActionIcon
                          size="md"
                          variant={
                            spanTextFeedback === false ? "filled" : "light"
                          }
                          color="red"
                          onClick={() => setSpanTextFeedback(false)}
                        >
                          <IconThumbDown size={18} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Stack>

                  <Stack gap={4}>
                    <Group gap={6} align="center">
                      <Text fw={700} size="sm">
                        Reasoning:
                      </Text>
                      {infoIcon("Short explanation produced by the model.")}
                    </Group>
                    <Group gap="sm" align="flex-start" wrap="nowrap" w="100%">
                      <Text
                        size="sm"
                        fs="italic"
                        c={mutedColor}
                        style={{ flex: 1 }}
                      >
                        {generatedReasoning || "Generating reasoning..."}
                      </Text>
                      <Group gap="xs" style={{ flexShrink: 0 }}>
                        <ActionIcon
                          size="md"
                          variant={
                            reasoningFeedback === true ? "filled" : "light"
                          }
                          color="green"
                          onClick={() => setReasoningFeedback(true)}
                        >
                          <IconThumbUp size={18} />
                        </ActionIcon>
                        <ActionIcon
                          size="md"
                          variant={
                            reasoningFeedback === false ? "filled" : "light"
                          }
                          color="red"
                          onClick={() => setReasoningFeedback(false)}
                        >
                          <IconThumbDown size={18} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Stack>
                </Stack>
              </Paper>

              {/* User Controls */}
              <Paper p="md" bg={surface3} radius="md">
                <Stack gap="md">
                  <Group justify="center" gap="xl">
                    <Button
                      leftSection={<IconCheck size={20} />}
                      color="green"
                      variant={
                        batchResults[currentIndex]?.isCorrect === true
                          ? "filled"
                          : "light"
                      }
                      onClick={() =>
                        setBatchResults(
                          (sample: Record<number, AIAssisted>) => ({
                            ...sample,
                            [currentIndex]: {
                              ...sample[currentIndex],
                              isCorrect: true,
                            },
                          }),
                        )
                      }
                    >
                      Correct
                    </Button>
                    <Button
                      leftSection={<IconX size={20} />}
                      color="red"
                      variant={
                        batchResults[currentIndex]?.isCorrect === false
                          ? "filled"
                          : "light"
                      }
                      onClick={() =>
                        setBatchResults((prev) => ({
                          ...prev,
                          [currentIndex]: {
                            ...prev[currentIndex],
                            isCorrect: false,
                          },
                        }))
                      }
                    >
                      Incorrect
                    </Button>
                  </Group>

                  {(batchResults[currentIndex]?.isCorrect === false ||
                    spanTextFeedback === false ||
                    reasoningFeedback === false) && (
                    <Stack gap="xs">
                      <Group gap="xs" align="center">
                        <Text size="sm" fw={600}>
                          Task Labels:
                        </Text>
                        {infoIcon(
                          "Labels defined in the task definition stage",
                        )}
                        <Group gap={4}>
                          {task?.labels?.length ? (
                            task.labels.map((l) => (
                              <Badge key={l.name} variant="light" color="gray">
                                {l.name}
                              </Badge>
                            ))
                          ) : (
                            <Text size="xs" c={mutedColor}>
                              Error retrieving task labels.
                            </Text>
                          )}
                        </Group>
                      </Group>
                      <Select
                        label="Correct label"
                        placeholder="Select the correct label"
                        data={(task?.labels || []).map((l) => ({
                          value: l.name,
                          label: l.name,
                        }))}
                        value={batchResults[currentIndex]?.correctLabel ?? null}
                        onChange={(value) =>
                          setBatchResults(
                            (sample: Record<number, AIAssisted>) => ({
                              ...sample,
                              [currentIndex]: {
                                ...sample[currentIndex],
                                correctLabel: value ?? null,
                              },
                            }),
                          )
                        }
                        required
                        allowDeselect={false}
                        styles={{
                          label: {
                            color: isLight ? "#0f1418" : "var(--app-text)",
                          },
                          input: {
                            background: surface2,
                            color: isLight ? "#0f1418" : "var(--app-text)",
                          },
                        }}
                      />
                      <Textarea
                        label="Feedback"
                        mt={4}
                        placeholder="Why was the AI wrong? (This will help the rule synthesizer)"
                        variant="filled"
                        size="sm"
                        required
                        styles={{
                          input: {
                            color: isLight ? "#0f1418" : "var(--app-text)",
                          },
                        }}
                        onChange={(e) => {
                          const userFeedback = e.currentTarget.value;
                          setBatchResults(
                            (sample: Record<number, AIAssisted>) => ({
                              ...sample,
                              [currentIndex]: {
                                ...sample[currentIndex],
                                feedback: userFeedback,
                              },
                            }),
                          );
                        }}
                      />
                    </Stack>
                  )}

                  <Group justify="space-between" mt="sm">
                    <Button
                      variant="subtle"
                      color="gray"
                      leftSection={<IconArrowLeft size={16} />}
                      disabled={currentIndex === 0 || isLoading}
                      onClick={() => setCurrentIndex((prev) => prev - 1)}
                    >
                      Previous
                    </Button>

                    <Button
                      rightSection={
                        currentBatchProgress === actualBatchSize ? (
                          <IconBook size={16} />
                        ) : (
                          <IconArrowRight size={16} />
                        )
                      }
                      color={
                        currentBatchProgress === actualBatchSize
                          ? "blue"
                          : "indigo"
                      }
                      disabled={
                        isLoading ||
                        batchResults[currentIndex]?.isCorrect == null ||
                        (batchResults[currentIndex]?.isCorrect === false &&
                          (!batchResults[currentIndex]?.feedback?.trim() ||
                            !batchResults[currentIndex]?.correctLabel)) ||
                        spanTextFeedback === undefined ||
                        reasoningFeedback === undefined
                      }
                      loading={isLoading}
                      onClick={async () => {
                        const shouldGenerateMetrics = isLastBatch;
                        let committedCodebook: string[] = [];
                        if (currentBatchProgress === actualBatchSize) {
                          committedCodebook = await handleCommitBatch();
                        }
                        await handleNextClick();
                        if (shouldGenerateMetrics && task?._id) {
                          const [sampleRes, metadataRes, batchRes] =
                            await Promise.all([
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
                              committedCodebook.length > 0
                                ? committedCodebook
                                : getCodebookSnapshot(),
                              lastPromptUsed,
                            );
                          } catch (error: any) {
                            console.error("Failed to export codebook:", error);
                            toast.error(
                              error?.message ||
                                "Failed to export codebook on server",
                            );
                          }
                          setReviewComplete(true);
                          setMetricsModalOpen(true);
                        }
                      }}
                    >
                      {currentBatchProgress === actualBatchSize
                        ? "Commit Batch"
                        : "Next Sample"}
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>

          {/* Sidebar: Live Codebook */}
          <Grid.Col span={4} h="100%" bg={panelBg}>
            <Stack h="100%" p="xl" gap="md">
              <Group justify="space-between">
                <Group gap="xs">
                  <IconBook color="var(--app-text)" />
                  <Title order={4} c={isLight ? "#0f1418" : "white"}>
                    Live Codebook
                  </Title>
                </Group>
                <Group gap="xs">
                  <Button
                    variant="filled"
                    color="blue"
                    size="xs"
                    radius="xl"
                    onClick={handleSaveCodebook}
                    loading={isSavingCodebook}
                    disabled={codebook.length === 0}
                  >
                    Save Codebook
                  </Button>
                  {reviewComplete && (
                    <Button
                      variant="outline"
                      color="blue"
                      size="xs"
                      radius="xl"
                      onClick={handleExportCodebook}
                      disabled={!lastPromptUsed}
                    >
                      Export Codebook
                    </Button>
                  )}
                  <Tooltip label="These rules guide the AI for future batches">
                    <IconInfoCircle size={18} color="gray" />
                  </Tooltip>
                </Group>
              </Group>

              <Divider color={borderColor} />

              <Stack gap="sm" style={{ flex: 1, overflowY: "auto" }}>
                {codebook.length === 0 && stagedRules.length === 0 ? (
                  <Center h={200}>
                    <Text c={mutedColor} size="sm" ta="center">
                      No rules generated yet.
                      <br />
                      Complete a batch to see AI synthesis.
                    </Text>
                  </Center>
                ) : (
                  <>
                    {codebook.map((rule, idx) => (
                      <Paper
                        key={idx}
                        p="sm"
                        bg={surface}
                        radius="sm"
                        style={{
                          border: `1px solid ${stagedRulesDeletion.includes(rule) ? "crimson" : borderColor}`,
                          opacity: stagedRulesDeletion.includes(rule) ? 0.5 : 1,
                        }}
                      >
                        <Group align="flex-start" wrap="nowrap">
                          <Text
                            size="sm"
                            style={{
                              textDecoration: stagedRulesDeletion.includes(rule)
                                ? "line-through"
                                : "none",
                            }}
                          >
                            {rule}
                          </Text>
                          <ActionIcon
                            size="sm"
                            color="green"
                            variant="subtle"
                            onClick={() => {
                              if (!stagedRulesDeletion.includes(rule)) {
                                setStagedRulesDeletion((prev) => [
                                  ...prev,
                                  rule,
                                ]);
                              }
                              setNewRule(rule);
                            }}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            color="red"
                            variant="subtle"
                            onClick={() => {
                              if (stagedRulesDeletion.includes(rule)) {
                                // Toggle off if already staged
                                setStagedRulesDeletion((prev) =>
                                  prev.filter((r) => r !== rule),
                                );
                              } else {
                                setStagedRulesDeletion((prev) => [
                                  ...prev,
                                  rule,
                                ]);
                              }
                            }}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Paper>
                    ))}

                    {stagedRules.length > 0 && (
                      <>
                        <Text size="xs" fw={700} c="orange" tt="uppercase">
                          Pending (added on batch commit)
                        </Text>
                        {stagedRules.map((rule, idx) => (
                          <Paper
                            key={`staged-${idx}`}
                            p="sm"
                            radius="sm"
                            style={{
                              border: `1px dashed orange`,
                              opacity: 0.8,
                            }}
                          >
                            <Group align="flex-start" wrap="nowrap">
                              <Text size="sm" style={{ flex: 1 }}>
                                {rule}
                              </Text>
                              <ActionIcon
                                size="sm"
                                color="red"
                                variant="subtle"
                                onClick={() =>
                                  setStagedRules((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  )
                                }
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Paper>
                        ))}
                      </>
                    )}
                  </>
                )}
              </Stack>

              <Divider color={borderColor} />

              <Stack gap="xs">
                <Text size="xs" fw={700} c={mutedColor} tt="uppercase">
                  Add Codebook Rule
                </Text>
                <Group gap="xs">
                  <Textarea
                    placeholder="Enter a custom rule..."
                    variant="filled"
                    size="sm"
                    style={{ flex: 1 }}
                    value={newRule}
                    onChange={(e) => setNewRule(e.currentTarget.value)}
                  />
                  <ActionIcon size="lg" color="blue" onClick={addRule}>
                    <IconPlus size={20} />
                  </ActionIcon>
                </Group>
              </Stack>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Box>
  );
}
