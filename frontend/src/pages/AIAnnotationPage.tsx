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
  Center,
  Box,
  Grid,
  Divider,
  Badge,
  ActionIcon,
  Tooltip,
  Modal,
  Checkbox,
  useMantineColorScheme,
} from "@mantine/core";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { inference, batchInference } from "../services/inference.service";
import {
  RuleSynthesisItem,
  RuleSynthesisRequest,
} from "@common/types/ruleSynthesis";
import { useTaskData } from "../hooks/useTaskData";
import { AnnotationItem } from "@common/types/annotations";
import { ruleSynthesis } from "../services/ruleSynthesis.service";
import {
  IconCheck,
  IconX,
  IconArrowLeft,
  IconArrowRight,
  IconBook,
  IconPlus,
  IconTrash,
  IconInfoCircle,
  IconPencil,
  IconThumbUp,
  IconThumbDown
} from "@tabler/icons-react";
import {
  InferenceRequest,
  InferenceResponse,
  BatchInferenceRequest,
  BatchInferenceSummary,
} from "@common/types/inference";
import StepTrackerBanner from "../components/StepTrackerBanner";
import { updateGuideAnnotation } from "../services/annotations.service";
import { saveTaskCodebook } from "../services/tasks.service";
import { toast } from "../lib/toast";
import { v4 as uuidv4 } from 'uuid';

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
  const { loading, task, guideData } = useTaskData();
  console.log("guidedata length: ", guideData.length)
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
  //const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const batchSize = 5;
  const currentBatchIndex = Math.floor(currentIndex / batchSize);
  const [currentBatchUUID, setCurrentBatchUUID] = useState<string>("");

  // Performance Metrics State
  const [totalCorrect, setTotalCorrect] = useState<number>(0);
  const [totalAttempted, setTotalAttempted] = useState<number>(0);
  const [predictedAccuracy, setPredictedAccuracy] = useState<number | null>(
    null,
  );
  const [introOpen, setIntroOpen] = useState(false);
  const [introDontShow, setIntroDontShow] = useState(false);
  const [introShowCheckbox, setIntroShowCheckbox] = useState(true);
  const [isSavingCodebook, setIsSavingCodebook] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [editingRuleValue, setEditingRuleValue] = useState("");

  // Codebook State
  const [codebook, setCodebook] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");

  // generated span text feedback
  const [spanTextFeedback, setSpanTextFeedback] = useState<boolean>();
  // generated reasoning  text feedback
  const [reasoningFeedback, setReasoningFeedback] = useState<boolean>();

  interface AIAssisted {
    taskID: string | null;
    batchID: string | null;
    label: string[];
    reason: string;
    span_text: string;
    isCorrect: boolean | null;
    feedback: string;
    spanFeedback: boolean | null;
    reasoningFeedback: boolean | null;
  }

  // Annotation States for current batch
  const [batchResults, setBatchResults] = useState<Record<number, AIAssisted>>(
    {},
  );

  // const [fallbackAnnotations, setFallbackAnnotations] = useState<
  //   AnnotationItem[]
  // >([]);

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
    guideData && guideData.length > 0 ? guideData : [];

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
  }

  useEffect(() => {
    setCurrentBatchUUID(generateBatchUUID());
  }, [currentBatchIndex]);

  useEffect(() => {
    if (task?.codebook && task.codebook.length > 0 && codebook.length === 0) {
      setCodebook(task.codebook);
    }
  }, [task, codebook.length]);

  const getSampleText = (sample?: CsvRow | null) => {
    if (!sample) return "";
    const combined = sample["text_combined"];
    if (typeof combined === "string" && combined.trim()) {
      return combined.trim();
    }
    const rawText = sample["text"];
    if (typeof rawText === "string") {
      return rawText.trim();
    }
    return "";
  };

  const handleClickAnnotation = async () => {
    if (!currentSample) return;
    const finalText = getSampleText(currentSample);
    if (!finalText) {
      console.warn("No text available for inference.");
      return;
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
    const response: InferenceResponse = await inference(payload);
    if (response) {
      console.log("Annotation Response: ", response);
      setBatchResults((sample: Record<number, AIAssisted>) => ({
        ...sample,
        [currentIndex]: {
          taskID: task?._id ?? null,
          batchID: currentBatchUUID,
          label: response.label,
          reason: response.reason,
          span_text: response.span_text,
          isCorrect: sample[currentIndex]?.isCorrect ?? null,
          feedback: sample[currentIndex]?.feedback ?? "",
          spanFeedback: spanTextFeedback ?? null,
          reasoningFeedback: reasoningFeedback ?? null
        },
      }));
      setGeneratedLabels(response.label);
      setGeneratedSpanText(response.span_text);
      setGeneratedReasoning(response.reason);
    }
    setIsLoading(false);
  };

  // Trigger inference whenever the index changes or when samples first become available.
  useEffect(() => {
    if (!guideData || currentIndex >= guideData.length)
      return;
    handleClickAnnotation();
  }, [currentIndex, guideData]);

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

  const infoIcon = (label: string) => (
    <Tooltip label={label} withArrow position="right">
      <ActionIcon size="xs" variant="subtle" color="gray" aria-label={label}>
        <IconInfoCircle size={14} />
      </ActionIcon>
    </Tooltip>
  );

  const currentSample = guideData && currentIndex > -1
    ? guideData[currentIndex]
    : null;

  const totalSamples = guideData.length;

  const actualBatchSize = Math.min(
    batchSize,
    totalSamples - Math.floor(currentIndex / batchSize) * batchSize,
  );

  if (loading) {
    return (
      <Center h="100vh" bg="var(--app-bg)">
        <Stack align="center" gap="md">
          <LoadingOverlay visible={true} overlayProps={{ blur: 2 }} />
          <Text c={isLight ? "#0f1418" : "white"}>
            Loading annotation data...
          </Text>
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

  const addRule = () => {
    if (newRule.trim()) {
      setCodebook([...codebook, newRule.trim()]);
      setNewRule("");
    }
  };

  const removeRule = (index: number) => {
    setCodebook(codebook.filter((_, i) => i !== index));
  };

  const handleStartEditRule = (index: number, value: string) => {
    setEditingRuleIndex(index);
    setEditingRuleValue(value);
  };

  const handleCancelEditRule = () => {
    setEditingRuleIndex(null);
    setEditingRuleValue("");
  };

  const handleSaveEditRule = () => {
    if (editingRuleIndex === null) return;
    const nextValue = editingRuleValue.trim();
    if (!nextValue) return;
    setCodebook((prev) =>
      prev.map((rule, idx) => (idx === editingRuleIndex ? nextValue : rule)),
    );
    setEditingRuleIndex(null);
    setEditingRuleValue("");
  };

  const handleNextClick = async () => {
    try {
      const currentAIResult = batchResults[currentIndex];
      if (currentAIResult && task?._id && currentSample) {
        await updateGuideAnnotation({
          taskId: task._id,
          sampleId: currentIndex + 1,
          sampleContent: currentSample as Record<string, string>,
          source: "guide",
          labels: currentAIResult.label,
          aiAnnotation: currentAIResult
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

  const handleCommitBatch = async () => {
    setIsLoading(true);
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
        .filter(([_, result]) => result.isCorrect === false) // Only pick incorrect annotations
        .map(([idx, result]) => {
          const i = parseInt(idx);
          const sample = guideData[i];
          // Create rule synthesis item
          return {
            sample_text: getSampleText(sample),
            ai_labels: result.label,
            ai_reasoning: result.reason,
            ai_span_text: result.span_text,
            ground_truth_labels: task.labels.map(item => item.name),
            user_feedback: result.feedback, // The actual string from the textarea
          };
        });

      // Only perform rule synthesis if there are any incorrect model annotations
      if (rule_synthesis_items.length > 0) {
        const request: RuleSynthesisRequest = {
          payload: rule_synthesis_items,
          task_type: "rule_synthesis",
          model_name: task.modelName || "mistral:7b",
        };
        const response = await ruleSynthesis(request);

        if (response.success) {
          // Append new rules to the live codebook
          setCodebook((prev) => [...prev, ...response.rules]);
        }
      }
    } catch (error: any) {
      console.error("Failed to synthesize rules:", error);
    } finally {
      setIsLoading(false);
    }
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
      h="100vh"
      bg={isLight ? "#f7fafb" : "var(--app-bg)"}
      c={isLight ? "#0f1418" : "var(--app-text)"}
    >
      <Stack h="100%" gap="md" p="xl">
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
          activeSteps={[2, 3]}
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
                style={{ border: `1px solid ${borderStrong}` }}
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
                    <Badge color="blue" variant="light">
                      {currentSample?.sampleId}
                    </Badge>
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
                          variant={spanTextFeedback === true ? "filled" : "light"}
                          color="green"
                          onClick={() => setSpanTextFeedback(true)}
                        >
                          <IconThumbUp size={18} />
                        </ActionIcon>
                        <ActionIcon
                          size="md"
                          variant={spanTextFeedback === false ? "filled" : "light"}
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
                      <Text size="sm" fs="italic" c={mutedColor} style={{ flex: 1 }}>
                        {generatedReasoning || "Generating reasoning..."}
                      </Text>
                      <Group gap="xs" style={{ flexShrink: 0 }}>
                        <ActionIcon
                          size="md"
                          variant={reasoningFeedback === true ? "filled" : "light"}
                          color="green"
                          onClick={() => setReasoningFeedback(true)}
                        >
                          <IconThumbUp size={18} />
                        </ActionIcon>
                        <ActionIcon
                          size="md"
                          variant={reasoningFeedback === false ? "filled" : "light"}
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

                  {batchResults[currentIndex]?.isCorrect === false && (
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
                      <Textarea
                        placeholder="Why was the AI wrong? (This will help the rule synthesizer)"
                        variant="filled"
                        size="sm"
                        bg={surface2}
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
                      disabled={currentIndex === 0}
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
                        batchResults[currentIndex]?.isCorrect == null ||
                        (batchResults[currentIndex]?.isCorrect === false &&
                          !batchResults[currentIndex]?.feedback?.trim())
                      }
                      loading={isLoading}
                      onClick={async () => {
                        if (currentBatchProgress === actualBatchSize) {
                          await handleCommitBatch();
                        }
                        handleNextClick();
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
                  <Tooltip label="These rules guide the AI for future batches">
                    <IconInfoCircle size={18} color="gray" />
                  </Tooltip>
                </Group>
              </Group>

              <Divider color={borderColor} />

              <Stack gap="sm" style={{ flex: 1, overflowY: "auto" }}>
                {codebook.length === 0 ? (
                  <Center h={200}>
                    <Text c={mutedColor} size="sm" ta="center">
                      No rules generated yet.
                      <br />
                      Complete a batch to see AI synthesis.
                    </Text>
                  </Center>
                ) : (
                  codebook.map((rule, idx) => (
                    <Paper
                      key={idx}
                      p="sm"
                      bg={surface}
                      radius="sm"
                      style={{ border: `1px solid ${borderColor}` }}
                    >
                      {editingRuleIndex === idx ? (
                        <Stack gap="xs">
                          <Textarea
                            value={editingRuleValue}
                            onChange={(e) =>
                              setEditingRuleValue(e.currentTarget.value)
                            }
                            variant="filled"
                            size="sm"
                          />
                          <Group justify="flex-end" gap="xs">
                            <Button
                              size="xs"
                              variant="subtle"
                              onClick={handleCancelEditRule}
                            >
                              Cancel
                            </Button>
                            <Button size="xs" onClick={handleSaveEditRule}>
                              Save
                            </Button>
                          </Group>
                        </Stack>
                      ) : (
                        <Group align="flex-start" wrap="nowrap">
                          <Text size="sm" style={{ flex: 1 }}>
                            {rule}
                          </Text>
                          <Group gap={4}>
                            <ActionIcon
                              size="sm"
                              color="gray"
                              variant="subtle"
                              onClick={() => handleStartEditRule(idx, rule)}
                            >
                              <IconPencil size={14} />
                            </ActionIcon>
                            <ActionIcon
                              size="sm"
                              color="red"
                              variant="subtle"
                              onClick={() => removeRule(idx)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      )}
                    </Paper>
                  ))
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
