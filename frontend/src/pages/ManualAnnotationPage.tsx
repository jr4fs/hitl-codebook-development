import {
  Text,
  Paper,
  Title,
  Group,
  Button,
  Stack,
  ScrollArea,
  Center,
  LoadingOverlay,
  Alert,
  Box,
  Modal,
  Checkbox,
  Switch,
  Textarea,
  ActionIcon,
  Divider,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconCheck,
  IconAlertCircle,
  IconPlus,
  IconTrash,
  IconPencil,
} from "@tabler/icons-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskData } from "../hooks/useTaskData";
import { AnnotationItem } from "@common/types/annotations";
import {
  addAnnotation,
  updateAnnotation,
} from "../services/annotations.service";
import StepTrackerBanner from "../components/StepTrackerBanner";
import { saveTaskCodebook } from "../services/tasks.service";

export default function ManualAnnotationPage() {
  const navigate = useNavigate();
  const { loading, subsampledData, task, annotations } = useTaskData();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentLabels, setCurrentLabels] = useState<string[]>([]);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [introDontShow, setIntroDontShow] = useState(false);
  const [introShowCheckbox, setIntroShowCheckbox] = useState(true);
  const [showDistribution, setShowDistribution] = useState(false);
  const [manualRules, setManualRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [editingRuleValue, setEditingRuleValue] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [localAnnotations, setLocalAnnotations] = useState<AnnotationItem[]>(
    [],
  );
  const hasInitializedIndex = useRef(false);

  const getSampleId = (sample: Record<string, any> | null, index: number) => {
    if (!sample) return index;
    const rawId =
      sample.example_id ?? sample.exampleId ?? sample.sampleId ?? sample.id;
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : index;
  };

  const uniqueSubsampledData = useMemo(() => {
    if (!subsampledData) return [] as Record<string, any>[];
    const seen = new Set<string>();
    return subsampledData.filter((sample, index) => {
      const rawId =
        sample.example_id ?? sample.exampleId ?? sample.sampleId ?? sample.id;
      const key = rawId ?? `index-${index}`;
      const keyString = String(key);
      if (seen.has(keyString)) {
        return false;
      }
      seen.add(keyString);
      return true;
    });
  }, [subsampledData]);

  const findNextUnannotatedIndex = (
    startIndex: number,
    annotatedIds: Set<number>,
  ) => {
    if (!uniqueSubsampledData.length) return startIndex;
    for (let i = startIndex; i < uniqueSubsampledData.length; i += 1) {
      const sampleId = getSampleId(
        uniqueSubsampledData[i] as Record<string, any>,
        i,
      );
      if (!annotatedIds.has(sampleId)) {
        return i;
      }
    }
    return uniqueSubsampledData.length;
  };

  const labelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    task?.labels?.forEach((label) => counts.set(label.name, 0));
    localAnnotations?.forEach((annotation) => {
      annotation.labels?.forEach((label) => {
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    });
    return Array.from(counts.entries());
  }, [localAnnotations, task]);

  const maxCount = Math.max(1, ...labelCounts.map(([, count]) => count));
  const totalCount = labelCounts.reduce((sum, [, count]) => sum + count, 0);

  const seedTarget = 7;
  const totalSamples = uniqueSubsampledData.length;
  const targetCount = Math.min(totalSamples, seedTarget);
  const annotatedSampleIds = useMemo(() => {
    return new Set(localAnnotations.map((annotation) => annotation.sampleId));
  }, [localAnnotations]);
  const annotatedCount = useMemo(() => {
    if (!uniqueSubsampledData.length) return 0;
    return uniqueSubsampledData.reduce((count, sample, index) => {
      const sampleId = getSampleId(sample as Record<string, any>, index);
      return annotatedSampleIds.has(sampleId) ? count + 1 : count;
    }, 0);
  }, [annotatedSampleIds, uniqueSubsampledData]);
  const reviewIndices = useMemo(() => {
    if (!uniqueSubsampledData.length) return [] as number[];
    return uniqueSubsampledData.reduce<number[]>((acc, sample, index) => {
      if (
        annotatedSampleIds.has(
          getSampleId(sample as Record<string, any>, index),
        )
      ) {
        acc.push(index);
      }
      return acc;
    }, []);
  }, [annotatedSampleIds, uniqueSubsampledData]);
  const currentSample =
    currentIndex < totalSamples ? uniqueSubsampledData[currentIndex] : null;
  const isCompleted = totalSamples > 0 && annotatedCount >= targetCount;
  const showCompletion = isCompleted && !isReviewing;

  useEffect(() => {
    hasInitializedIndex.current = false;
    setIsReviewing(false);
  }, [task?._id]);

  // Set initial index based on existing annotations
  useEffect(() => {
    if (hasInitializedIndex.current) return;
    if (!loading && uniqueSubsampledData.length > 0) {
      if (annotatedCount >= targetCount) {
        setCurrentIndex(uniqueSubsampledData.length);
        hasInitializedIndex.current = true;
        return;
      }

      // Find the first index that hasn't been annotated yet
      const firstUnannotatedIndex = uniqueSubsampledData.findIndex(
        (sample, index) =>
          !annotatedSampleIds.has(
            getSampleId(sample as Record<string, any>, index),
          ),
      );

      if (firstUnannotatedIndex !== -1) {
        setCurrentIndex(firstUnannotatedIndex);
      } else {
        setCurrentIndex(uniqueSubsampledData.length);
      }
      hasInitializedIndex.current = true;
    }
  }, [
    loading,
    annotatedCount,
    annotatedSampleIds,
    uniqueSubsampledData,
    targetCount,
  ]);

  useEffect(() => {
    if (isCompleted && !isReviewing) {
      setCurrentIndex(totalSamples);
    }
  }, [isCompleted, isReviewing, totalSamples]);

  useEffect(() => {
    const hideIntro = localStorage.getItem("hideStep2Intro") === "true";
    if (!hideIntro) {
      setIntroShowCheckbox(true);
      setIntroOpen(true);
    }
  }, []);

  useEffect(() => {
    if (annotations) {
      setLocalAnnotations(annotations);
    }
  }, [annotations]);

  useEffect(() => {
    if (!task?._id) return;
    const storageKey = `manualRules_${task._id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setManualRules(parsed);
          return;
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    }

    if (task.codebook && task.codebook.length > 0) {
      setManualRules(task.codebook);
    }
  }, [task]);

  useEffect(() => {
    if (!task?._id) return;
    const storageKey = `manualRules_${task._id}`;
    localStorage.setItem(storageKey, JSON.stringify(manualRules));
  }, [manualRules, task?._id]);

  const handleCloseIntro = () => {
    if (introShowCheckbox && introDontShow) {
      localStorage.setItem("hideStep2Intro", "true");
    }
    setIntroOpen(false);
  };

  const handleHelp = () => {
    setIntroShowCheckbox(false);
    setIntroOpen(true);
  };

  const handleAddRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    setManualRules((prev) => [...prev, trimmed]);
    setNewRule("");
  };

  const handleRemoveRule = (index: number) => {
    setManualRules((prev) => prev.filter((_, i) => i !== index));
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
    setManualRules((prev) =>
      prev.map((rule, idx) => (idx === editingRuleIndex ? nextValue : rule)),
    );
    setEditingRuleIndex(null);
    setEditingRuleValue("");
  };

  // Update/Reset current labels when index changes
  useEffect(() => {
    if (currentSample && localAnnotations) {
      const sampleId = getSampleId(
        currentSample as Record<string, any>,
        currentIndex,
      );
      const existingAnnotation = localAnnotations.find(
        (a) => a.sampleId === sampleId,
      );
      setCurrentLabels(existingAnnotation ? existingAnnotation.labels : []);
    } else {
      setCurrentLabels([]);
    }
    setStatus(null);
  }, [currentIndex, localAnnotations]);

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

  if (!task || uniqueSubsampledData.length === 0) {
    return (
      <Center h="100vh" bg="#0f1418">
        <Stack align="center" gap="md">
          <Text c="white">No data available for annotation</Text>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </Stack>
      </Center>
    );
  }

  const handleLabelClick = (label: string) => {
    if (currentLabels.includes(label)) {
      setCurrentLabels(currentLabels.filter((l) => l !== label));
    } else {
      setCurrentLabels([...currentLabels, label]);
    }
  };

  const handleSaveClick = async () => {
    if (currentLabels.length === 0) {
      setStatus({ type: "error", message: "Please select at least one label" });
      return;
    }

    if (!task?._id || !currentSample) return;

    setIsSaving(true);
    try {
      const sampleId = getSampleId(
        currentSample as Record<string, any>,
        currentIndex,
      );
      const existingAnnotation = localAnnotations?.find(
        (a) => a.sampleId === sampleId,
      );
      let response;

      if (existingAnnotation?._id) {
        // Update existing annotation
        response = await updateAnnotation({
          annotationId: existingAnnotation._id,
          labels: currentLabels,
        });
      } else {
        // Add new annotation
        response = await addAnnotation({
          taskId: task._id,
          sampleId,
          annotationSampleRow: currentSample,
          labels: currentLabels,
        });
      }

      if (response.success) {
        let nextAnnotations: AnnotationItem[] = [];
        if (existingAnnotation?._id) {
          nextAnnotations = localAnnotations.map((ann) =>
            ann._id === existingAnnotation._id
              ? { ...ann, labels: currentLabels }
              : ann,
          );
        } else {
          const newAnnotationId = (response as { annotationId?: string })
            .annotationId;
          nextAnnotations = [
            ...localAnnotations,
            {
              _id: newAnnotationId,
              taskId: task._id,
              sampleId,
              sampleContent: currentSample as Record<string, string>,
              labels: currentLabels,
              createdBy: "",
              createdAt: new Date().toISOString(),
            },
          ];
        }

        const nextAnnotatedIds = new Set(
          nextAnnotations.map((annotation) => annotation.sampleId),
        );

        setLocalAnnotations(nextAnnotations);
        setStatus({
          type: "success",
          message: "Annotation saved successfully",
        });
        if (isReviewing) {
          const reviewPos = reviewIndices.indexOf(currentIndex);
          if (reviewPos === -1) {
            if (reviewIndices.length > 0) {
              setCurrentIndex(reviewIndices[reviewIndices.length - 1]);
            }
            return;
          }

          if (reviewPos < reviewIndices.length - 1) {
            setCurrentIndex(reviewIndices[reviewPos + 1]);
          } else {
            setIsReviewing(false);
            setCurrentIndex(totalSamples);
          }
          return;
        }

        // Short delay to allow user to review annotation
        const nextIndex = findNextUnannotatedIndex(
          currentIndex + 1,
          nextAnnotatedIds,
        );
        setTimeout(() => {
          if (currentIndex <= totalSamples) {
            setCurrentIndex(nextIndex);
          }
        }, 250);
      } else {
        setStatus({
          type: "error",
          message: response.message || "Failed to save annotation",
        });
      }
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "An unexpected error occurred",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    if (isReviewing) {
      const reviewPos = reviewIndices.indexOf(currentIndex);
      if (reviewPos === -1) {
        if (reviewIndices.length > 0) {
          setCurrentIndex(reviewIndices[reviewIndices.length - 1]);
        }
        return;
      }

      if (reviewPos > 0) {
        setCurrentIndex(reviewIndices[reviewPos - 1]);
      }
      return;
    }

    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleGoAIAnnotateClick = async () => {
    if (task?._id) {
      try {
        await saveTaskCodebook(task._id, manualRules);
      } catch (error) {
        console.error("Failed to save codebook seed:", error);
      }
    }

    navigate(`/auto-annotate/${task?._id}`, {
      state: {
        subsampledCsv: uniqueSubsampledData,
        task: task ? { ...task, codebook: manualRules } : task,
        annotations: localAnnotations,
      },
    });
  };

  const handleGoBackToReview = () => {
    if (reviewIndices.length === 0) {
      return;
    }

    setIsReviewing(true);
    setCurrentIndex(reviewIndices[reviewIndices.length - 1]);
  };

  return (
    <Paper mih="100vh" bg="#0f1418" c="#D8D8D8" p="lg">
      <Stack align="center" justify="center" gap="md" maw={900} mx="auto">
        <Modal
          opened={introOpen}
          onClose={handleCloseIntro}
          centered
          title="Step 2: Manual seed annotation"
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
              Label a focused set of samples to give the AI clear examples and
              establish a baseline for how the data should be labeled.
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
        <StepTrackerBanner currentStep={2} onHelp={handleHelp} />
        <Group justify="space-between" w="100%">
          <Title order={3} c="white">
            Manual Annotation
          </Title>
          <Text size="sm" c="dimmed">
            {showCompletion
              ? "All samples completed"
              : `Sample ${currentIndex + 1} / ${totalSamples}`}
          </Text>
        </Group>

        <Paper
          w="100%"
          p="md"
          bg="#1b242b"
          radius="md"
          style={{ border: "1px solid #2c3a45" }}
        >
          <Group justify="space-between" align="center">
            <Text fw={600} c="white">
              Label distribution
            </Text>
            <Switch
              checked={showDistribution}
              onChange={(event) =>
                setShowDistribution(event.currentTarget.checked)
              }
              label={showDistribution ? "Hide" : "Show"}
              size="sm"
              styles={{
                root: { cursor: "pointer" },
                body: { cursor: "pointer" },
                track: { cursor: "pointer" },
                thumb: { cursor: "pointer" },
                label: { cursor: "pointer" },
              }}
            />
          </Group>
          {showDistribution && (
            <Stack gap="xs" mt="sm">
              {labelCounts.map(([label, count]) => {
                const percent =
                  totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return (
                  <Group key={label} gap="sm" align="center">
                    <Text w={140} size="sm" c="dimmed">
                      {label}
                    </Text>
                    <Box
                      style={{
                        flex: 1,
                        height: 8,
                        background: "rgba(124, 231, 225, 0.12)",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        style={{
                          width: `${Math.round((count / maxCount) * 100)}%`,
                          height: "100%",
                          background:
                            "linear-gradient(90deg, #7ce7e1, #36c2b3)",
                        }}
                      />
                    </Box>
                    <Text size="sm" c="dimmed" w={64} ta="right">
                      {count} ({percent}%)
                    </Text>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Paper>

        <Paper
          w="100%"
          p="md"
          bg="#1b242b"
          radius="md"
          style={{ border: "1px solid #2c3a45" }}
        >
          <Group justify="space-between" align="center">
            <Text fw={600} c="white">
              Seed Codebook Rules
            </Text>
            <Text size="xs" c="dimmed">
              Optional
            </Text>
          </Group>
          <Text size="sm" c="dimmed" mt={4}>
            Add your labeling intuition here. These rules seed the live codebook
            in the next step.
          </Text>
          <Divider my="sm" color="#2b3944" />
          <Stack gap="sm">
            {manualRules.length === 0 ? (
              <Text size="sm" c="dimmed">
                No rules yet. Add your first rule below.
              </Text>
            ) : (
              manualRules.map((rule, idx) => (
                <Paper
                  key={`${idx}-${rule.slice(0, 12)}`}
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
                          onClick={() => handleRemoveRule(idx)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  )}
                </Paper>
              ))
            )}
            <Group gap="xs" align="flex-start">
              <Textarea
                placeholder="Add a new rule..."
                variant="filled"
                size="sm"
                style={{ flex: 1 }}
                value={newRule}
                onChange={(e) => setNewRule(e.currentTarget.value)}
              />
              <ActionIcon
                size="lg"
                color="blue"
                variant="filled"
                onClick={handleAddRule}
                aria-label="Add rule"
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Group>
          </Stack>
        </Paper>

        {status && (
          <Alert
            variant="light"
            color={
              status.type === "success"
                ? "green"
                : status.type === "error"
                  ? "red"
                  : "blue"
            }
            title={
              status.type === "success"
                ? "Success"
                : status.type === "error"
                  ? "Error"
                  : "Info"
            }
            icon={
              status.type === "success" ? (
                <IconCheck />
              ) : status.type === "error" ? (
                <IconAlertCircle />
              ) : (
                <IconInfoCircle />
              )
            }
            w="100%"
            styles={{
              message: {
                color:
                  status.type === "success"
                    ? "green"
                    : status.type === "error"
                      ? "#E85F59"
                      : "blue",
              },
            }}
          >
            {status.message}
          </Alert>
        )}

        <Box w="100%">
          <ScrollArea
            h={300}
            bg="#1c242b"
            p="md"
            style={{ borderRadius: "8px", border: "1px solid #2b3944" }}
          >
            {showCompletion ? (
              <Center h={250}>
                <Stack align="center">
                  <IconCheck size={48} color="green" />
                  <Text size="xl" fw={700}>
                    All samples have been annotated!
                  </Text>
                  <Text c="dimmed">
                    Review your annotations or proceed to AI-assisted
                    annotation.
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Text size="lg" style={{ whiteSpace: "pre-wrap" }}>
                {currentSample?.["text_combined"] ||
                  JSON.stringify(currentSample)}
              </Text>
            )}
          </ScrollArea>
        </Box>

        {!showCompletion && (
          <>
            <Group justify="center" wrap="wrap" gap="sm">
              {task?.labels.map((labelItem) => (
                <Button
                  key={labelItem.name}
                  variant={
                    currentLabels.includes(labelItem.name)
                      ? "filled"
                      : "outline"
                  }
                  color={
                    currentLabels.includes(labelItem.name) ? "blue" : "gray"
                  }
                  onClick={() => handleLabelClick(labelItem.name)}
                  size="md"
                >
                  {labelItem.name}
                </Button>
              ))}
            </Group>

            <Group gap="md" mt="xl">
              <Button
                variant="default"
                onClick={handlePrevious}
                disabled={currentIndex === 0 || isSaving}
              >
                Previous
              </Button>
              <Button
                w={200}
                color="green"
                onClick={handleSaveClick}
                loading={isSaving}
              >
                {localAnnotations?.find(
                  (a) =>
                    a.sampleId ===
                    getSampleId(
                      currentSample as Record<string, any>,
                      currentIndex,
                    ),
                )
                  ? "Update & Next"
                  : "Save & Next"}
              </Button>
            </Group>
          </>
        )}

        {showCompletion && (
          <Group mt="xl">
            <Button variant="default" onClick={handleGoBackToReview}>
              Go Back to Review
            </Button>
            <Button color="blue" onClick={handleGoAIAnnotateClick}>
              Go to AI Annotation
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
