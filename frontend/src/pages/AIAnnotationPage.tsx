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
} from "@tabler/icons-react";
import {
  InferenceRequest,
  InferenceResponse,
  BatchInferenceRequest,
  BatchInferenceSummary,
} from "@common/types/inference";
import StepTrackerBanner from "../components/StepTrackerBanner";
import { saveTaskCodebook } from "../services/tasks.service";
import { toast } from "../lib/toast";

export default function AnnotationPage() {
  const navigate = useNavigate();
  const { loading, task, annotations, restData } = useTaskData();

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
  const batchSize = 1;
  const currentBatchIndex = Math.floor(currentIndex / batchSize);

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

  interface AIAssisted {
    label: string[];
    reason: string;
    span_text: string;
    isCorrect: boolean | null;
    feedback: string;
  }

  // Annotation States for current batch
  const [batchResults, setBatchResults] = useState<Record<number, AIAssisted>>(
    {},
  );

  const datasetShuffler = (dataset: AnnotationItem[], ratio: number) => {
    const n = dataset.length;
    const shuffled = [...dataset];
    for (let i = n - 1; i > 0; i--) {
      const randIndex = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[randIndex]] = [shuffled[randIndex], shuffled[i]];
    }
    // Ensure at least one sample in the split if the dataset is not empty
    const splitIndex = n > 0 ? Math.max(1, Math.floor(n * ratio)) : 0;
    return {
      tenPercent: shuffled.slice(0, splitIndex),
      ninetyPercent: shuffled.slice(splitIndex),
    };
  };

  const [workingSamples, setWorkingSamples] = useState<{
    tenPercent: AnnotationItem[];
    ninetyPercent: AnnotationItem[];
  } | null>(null);
  const [fallbackAnnotations, setFallbackAnnotations] = useState<
    AnnotationItem[]
  >([]);

  useEffect(() => {
    setWorkingSamples(null);
  }, [task?._id]);

  useEffect(() => {
    if (annotations && annotations.length > 0) {
      setFallbackAnnotations([]);
      return;
    }

    if (!task?._id || !restData || restData.length === 0) {
      return;
    }

    if (fallbackAnnotations.length > 0) {
      return;
    }

    const shuffled = [...restData].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, Math.min(20, shuffled.length));
    const generated = sample.map((row, idx) => {
      const textValue = String(row.text || "");
      return {
        taskId: task._id as string,
        sampleId: idx + 1,
        sampleContent: {
          ...row,
          text_combined: textValue,
        } as Record<string, string>,
        labels: [],
        createdBy: "system",
        createdAt: new Date().toISOString(),
      } as AnnotationItem;
    });

    setFallbackAnnotations(generated);
  }, [annotations, restData, task?._id, fallbackAnnotations.length]);

  const annotationsForReview =
    annotations && annotations.length > 0 ? annotations : fallbackAnnotations;

  // Persist the 10/90 split in localStorage so a page refresh restores the same
  // partition. Keyed by taskId to avoid cross-task collisions.
  useEffect(() => {
    if (!annotationsForReview.length || !task?._id || workingSamples) return;

    if (annotations && annotations.length > 0) {
      const storageKey = `workingSamples_${task._id}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        try {
          setWorkingSamples(JSON.parse(stored));
          return;
        } catch {
          localStorage.removeItem(storageKey);
        }
      }

      const split = datasetShuffler(annotations as any, 0.1);
      localStorage.setItem(storageKey, JSON.stringify(split));
      setWorkingSamples(split);
      return;
    }

    const split = datasetShuffler(annotationsForReview as any, 0.1);
    setWorkingSamples(split);
  }, [annotations, annotationsForReview, task, workingSamples]);

  useEffect(() => {
    if (task?.codebook && task.codebook.length > 0 && codebook.length === 0) {
      setCodebook(task.codebook);
    }
  }, [task, codebook.length]);

  const getSampleText = (sample?: AnnotationItem | null) => {
    if (!sample?.sampleContent) return "";
    const combined = sample.sampleContent["text_combined"];
    if (typeof combined === "string" && combined.trim()) {
      return combined.trim();
    }
    const rawText = sample.sampleContent["text"];
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
      model_name: "mistral:7b",
      task_type: "annotation",
      user_input: codebook.join("\n"), // Rules synthesized by an LLM and the user's rules
    };
    const response: InferenceResponse = await inference(payload);
    if (response) {
      console.log("MODEL RESPONSE: ", response);
      setBatchResults((sample: Record<number, AIAssisted>) => ({
        ...sample,
        [currentIndex]: {
          label: response.label,
          reason: response.reason,
          span_text: response.span_text,
          isCorrect: sample[currentIndex]?.isCorrect ?? null,
          feedback: sample[currentIndex]?.feedback ?? "",
        },
      }));
      setGeneratedLabels(response.label);
      setGeneratedSpanText(response.span_text);
      setGeneratedReasoning(response.reason);
    }
    console.log(response);
    setIsLoading(false);
  };
  // Trigger inference whenever the index changes or when samples first become available.
  useEffect(() => {
    if (!workingSamples || currentIndex >= workingSamples.tenPercent.length)
      return;
    handleClickAnnotation();
  }, [currentIndex, workingSamples]);

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

  const currentSample =
    workingSamples && currentIndex > -1
      ? workingSamples?.tenPercent[currentIndex]
      : null;
  const totalSamples = workingSamples?.tenPercent.length || 0;

  const actualBatchSize = Math.min(
    batchSize,
    totalSamples - Math.floor(currentIndex / batchSize) * batchSize,
  );

  if (loading) {
    return (
      <Center h="100vh" bg="#0f1418">
        <Stack align="center" gap="md">
          <LoadingOverlay visible={true} overlayProps={{ blur: 2 }} />
          <Text c="white">Loading annotation data...</Text>
        </Stack>
      </Center>
    );
  }

  if (!task || annotationsForReview.length === 0) {
    return (
      <Center h="100vh" bg="#0f1418">
        <Stack align="center" gap="md">
          <Text c="white">No data available for annotation</Text>
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

  const handleNextClick = () => {
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
          const sample = workingSamples?.tenPercent[i];
          // Create rule synthesis item
          return {
            sample_text: sample?.sampleContent["text_combined"] || "",
            ai_labels: result.label,
            ai_reasoning: result.reason,
            ai_span_text: result.span_text,
            ground_truth_labels: sample?.labels || [],
            user_feedback: result.feedback, // The actual string from the textarea
          };
        });

      // Only perform rule synthesis if there are any incorrect model annotations
      if (rule_synthesis_items.length > 0) {
        const request: RuleSynthesisRequest = {
          payload: rule_synthesis_items,
          task_type: "rule_synthesis",
          model_name: "mistral:7b",
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

  const handleBatchInferenceClick = async () => {
    if (!workingSamples?.ninetyPercent.length || !task) return;
    //setIsLoading(true);
    try {
      const payload: BatchInferenceRequest[] = workingSamples.ninetyPercent.map(
        (sample) => ({
          labels: task.labels,
          task_definition: task.description || "",
          case_notes: getSampleText(sample),
          model_name: "mistral:7b",
          task_type: "annotation",
          user_input: codebook.join("\n"),
          ground_truth_labels: (sample.labels || []).map((labelName) => {
            const taskLabel = task.labels.find((l) => l.name === labelName);
            return (
              taskLabel || { name: labelName, definition: "", keywords: [] }
            );
          }),
        }),
      );

      const summary = await batchInference(payload);
      if (summary) {
        setPredictedAccuracy(summary.accuracy);
      }
    } catch (error) {
      console.error("Batch evaluation failed:", error);
    } finally {
      //setIsLoading(false);
    }
  };

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
    <Box h="100vh" bg="#0f1418" c="#D8D8D8">
      <Stack h="100%" gap="md" p="xl">
        <Modal
          opened={introOpen}
          onClose={handleCloseIntro}
          centered
          title="Step 2: AI annotation review"
          overlayProps={{ blur: 2, opacity: 0.5, color: "#11171c" }}
          styles={{
            content: {
              backgroundColor: "rgba(20, 28, 34, 0.98)",
              border: "1px solid rgba(124, 231, 225, 0.25)",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
              color: "#e8eef1",
            },
            header: { backgroundColor: "transparent" },
            title: { color: "#e8eef1", fontWeight: 600 },
            close: { color: "#e8eef1" },
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
            style={{ borderRight: "1px solid #2b3944" }}
          >
            <Stack h="100%" p="xl" gap="md">
              {/* Header / Batch Ribbon */}
              <Group justify="space-between">
                <Group gap="sm">
                  <Stack gap={0}>
                    <Title order={3} c="white">
                      AI Assisted Annotation
                    </Title>
                    <Text size="xs" c="dimmed">
                      Task: {task.name}
                    </Text>
                    <Text size="xs" c="dimmed">
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
                        style={{ border: "1px solid #444" }}
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
                        style={{ border: "1px solid #333" }}
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
                    <Text size="xs" c="dimmed">
                      ...
                    </Text>
                  )}
                </Group>
              </Group>

              <Divider color="#2b3944" />

              {/* Progress in Batch */}
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Batch Progress: {currentBatchProgress} / {actualBatchSize}
                </Text>
                <Text size="sm" c="dimmed">
                  Overall: {currentIndex + 1} / {totalSamples}
                </Text>
              </Group>

              <Text size="sm" fw={600} c="white">
                Final Text
              </Text>
              <Paper
                bg="#1c242b"
                p="md"
                radius="md"
                style={{ border: "1px solid #2b3944", flex: 1 }}
              >
                <ScrollArea h="150">
                  <Text size="lg" style={{ whiteSpace: "pre-wrap" }}>
                    {getSampleText(currentSample) || "No text available"}
                  </Text>
                </ScrollArea>
              </Paper>

              {/* AI Output Section */}
              <Paper
                bg="#1f2a32"
                p="md"
                radius="md"
                style={{ border: "1px solid #33424d" }}
              >
                <LoadingOverlay
                  visible={isLoading}
                  overlayProps={{ blur: 1 }}
                />
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Group gap={6} align="center">
                      <Title order={5} c="white">
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
                    <Text
                      size="sm"
                      bg="#333"
                      p="xs"
                      style={{ borderRadius: "4px" }}
                    >
                      {generatedSpanText || "..."}
                    </Text>
                  </Stack>

                  <Stack gap={4}>
                    <Group gap={6} align="center">
                      <Text fw={700} size="sm">
                        Reasoning:
                      </Text>
                      {infoIcon("Short explanation produced by the model.")}
                    </Group>
                    <Text size="sm" fs="italic" c="dimmed">
                      {generatedReasoning || "Generating reasoning..."}
                    </Text>
                  </Stack>
                </Stack>
              </Paper>

              {/* User Controls */}
              <Paper p="md" bg="#182028" radius="md">
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
                          Ground Truth Labels:
                        </Text>
                        {infoIcon(
                          "Labels from your uploaded D_val seed set, when available.",
                        )}
                        <Group gap={4}>
                          {currentSample?.labels?.length ? (
                            currentSample.labels.map((l) => (
                              <Badge key={l} variant="light" color="gray">
                                {l}
                              </Badge>
                            ))
                          ) : (
                            <Text size="xs" c="dimmed">
                              No ground truth labels available.
                            </Text>
                          )}
                        </Group>
                      </Group>
                      <Textarea
                        placeholder="Why was the AI wrong? (This will help the rule synthesizer)"
                        variant="filled"
                        size="sm"
                        bg="#1A1A1A"
                        styles={{ input: { color: "#1A1A1A" } }}
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

                    {codebook.length > 0 && (
                      <Button
                        variant="filled"
                        color="green"
                        onClick={() => handleBatchInferenceClick()}
                      >
                        Evaluate
                      </Button>
                    )}

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
          <Grid.Col span={4} h="100%" bg="#12181d">
            <Stack h="100%" p="xl" gap="md">
              <Group justify="space-between">
                <Group gap="xs">
                  <IconBook color="#D8D8D8" />
                  <Title order={4} c="white">
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

              <Divider color="#2b3944" />

              <Stack gap="sm" style={{ flex: 1, overflowY: "auto" }}>
                {codebook.length === 0 ? (
                  <Center h={200}>
                    <Text c="dimmed" size="sm" ta="center">
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
                      bg="#1c242b"
                      radius="sm"
                      style={{ border: "1px solid #2b3944" }}
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

              <Divider color="#2b3944" />

              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
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
