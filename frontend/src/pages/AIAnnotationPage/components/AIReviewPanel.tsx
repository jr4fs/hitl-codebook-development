import {
  ActionIcon,
  Badge,
  Button,
  Group,
  LoadingOverlay,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { IconArrowLeft, IconArrowRight, IconBook, IconCheck, IconInfoCircle, IconX } from "@tabler/icons-react";
import { AIAssisted } from "../types";
import styles from "../AIAnnotationPage.module.css";

interface LabelOption {
  name: string;
  description?: string;
  definition?: string;
}

interface AIReviewPanelProps {
  isLight: boolean;
  mutedColor: string;
  surface: string;
  surface2: string;
  surface3: string;
  borderColor: string;
  borderStrong: string;
  isLoading: boolean;
  currentBatchProgress: number;
  actualBatchSize: number;
  currentIndex: number;
  totalSamples: number;
  currentBatchStartIndex: number;
  currentSampleText: string;
  generatedLabels: string[];
  generatedSpanText: string;
  generatedReasoning: string;
  batchResult?: AIAssisted;
  spanTextFeedback?: boolean;
  reasoningFeedback?: boolean;
  labels: LabelOption[];
  onPrev: () => void;
  onNext: () => void;
  isCommitStep: boolean;
  nextDisabled: boolean;
  onSetCorrect: (value: boolean) => void;
  onSetSpanFeedback: (value: boolean) => void;
  onSetReasoningFeedback: (value: boolean) => void;
  onSetCorrectLabel: (label: string | null) => void;
  onSetFeedback: (value: string) => void;
}

const infoIcon = (label: string) => (
  <Tooltip label={label} withArrow position="right">
    <ActionIcon size="xs" variant="subtle" color="gray" aria-label={label}>
      <IconInfoCircle size={14} />
    </ActionIcon>
  </Tooltip>
);

export function AIReviewPanel({
  isLight,
  mutedColor,
  surface,
  surface2,
  surface3,
  borderColor,
  borderStrong,
  isLoading,
  currentBatchProgress,
  actualBatchSize,
  currentIndex,
  totalSamples,
  currentBatchStartIndex,
  currentSampleText,
  generatedLabels,
  generatedSpanText,
  generatedReasoning,
  batchResult,
  spanTextFeedback,
  reasoningFeedback,
  labels,
  onPrev,
  onNext,
  isCommitStep,
  nextDisabled,
  onSetCorrect,
  onSetSpanFeedback,
  onSetReasoningFeedback,
  onSetCorrectLabel,
  onSetFeedback,
}: AIReviewPanelProps) {
  return (
    <Paper radius="lg" h="100%" bg={surface}>
      <Stack h="100%" p="md" gap="md" style={{ overflow: "auto" }}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Text size="sm" fw={600}>
              Batch {currentBatchProgress}/{actualBatchSize}
            </Text>
            <Text size="sm" c={mutedColor}>
              Overall {currentIndex + 1}/{totalSamples}
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconArrowLeft size={16} />}
              disabled={currentIndex <= currentBatchStartIndex || isLoading}
              onClick={onPrev}
            >
              Previous
            </Button>
            <Button
              rightSection={isCommitStep ? <IconBook size={16} /> : <IconArrowRight size={16} />}
              color={isCommitStep ? "blue" : "indigo"}
              disabled={nextDisabled}
              loading={isLoading}
              onClick={onNext}
            >
              {isCommitStep ? "Commit Batch" : "Next Sample"}
            </Button>
          </Group>
        </Group>

        <Paper
          bg={surface}
          p="sm"
          radius="md"
          style={{ border: `1px solid ${borderColor}` }}
          className={styles.sampleBox}
        >
          <div className={styles.samplePreviewText}>{currentSampleText}</div>
        </Paper>

        <Paper bg={surface2} p="md" radius="md" style={{ border: `1px solid ${borderStrong}`, position: "relative" }}>
          <LoadingOverlay visible={isLoading} overlayProps={{ blur: 1 }} />
          <Stack gap="xs">
            <Group gap={6} align="center">
              <Text size="md" fw={700} c={isLight ? "#0f1418" : "white"}>
                AI Suggestion
              </Text>
              {infoIcon("The model's proposed labels and rationale.")}
            </Group>

            <Group gap="sm" align="flex-start" wrap="nowrap" w="100%">
              <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                <Text size="md" fw={700}>
                  Labels:
                </Text>
                {generatedLabels.map((label) => (
                  <Badge key={label} size="lg" variant="filled" color={isLight ? "teal" : "cyan"}>
                    {label || "..."}
                  </Badge>
                ))}
              </Group>
              <Group gap="xs" style={{ flexShrink: 0 }}>
                <ActionIcon
                  size="md"
                  variant={batchResult?.isCorrect === true ? "filled" : "outline"}
                  color="green"
                  style={{ opacity: batchResult?.isCorrect === true ? 1 : 0.55 }}
                  onClick={() => onSetCorrect(true)}
                >
                  <IconCheck size={18} />
                </ActionIcon>
                <ActionIcon
                  size="md"
                  variant={batchResult?.isCorrect === false ? "filled" : "outline"}
                  color="red"
                  style={{ opacity: batchResult?.isCorrect === false ? 1 : 0.55 }}
                  onClick={() => onSetCorrect(false)}
                >
                  <IconX size={18} />
                </ActionIcon>
              </Group>
            </Group>

            <Stack gap={4}>
              <Group gap={6} align="center">
                <Text fw={700} size="md">
                  Span Text:
                </Text>
                {infoIcon("Key text span the model used to justify the label.")}
              </Group>
              <Group gap="sm" align="flex-start" wrap="nowrap" w="100%">
                <Text
                  size="sm"
                  bg={surface}
                  p="xs"
                  style={{ flex: 1, borderRadius: 6, border: `1px solid ${borderColor}` }}
                >
                  {generatedSpanText || "..."}
                </Text>
                <Group gap="xs" style={{ flexShrink: 0 }}>
                  <ActionIcon
                    size="md"
                    variant={spanTextFeedback === true ? "filled" : "outline"}
                    color="green"
                    style={{ opacity: spanTextFeedback === true ? 1 : 0.55 }}
                    onClick={() => onSetSpanFeedback(true)}
                  >
                    <IconCheck size={18} />
                  </ActionIcon>
                  <ActionIcon
                    size="md"
                    variant={spanTextFeedback === false ? "filled" : "outline"}
                    color="red"
                    style={{ opacity: spanTextFeedback === false ? 1 : 0.55 }}
                    onClick={() => onSetSpanFeedback(false)}
                  >
                    <IconX size={18} />
                  </ActionIcon>
                </Group>
              </Group>
            </Stack>

            <Stack gap={4}>
              <Group gap={6} align="center">
                <Text fw={700} size="md">
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
                    variant={reasoningFeedback === true ? "filled" : "outline"}
                    color="green"
                    style={{ opacity: reasoningFeedback === true ? 1 : 0.55 }}
                    onClick={() => onSetReasoningFeedback(true)}
                  >
                    <IconCheck size={18} />
                  </ActionIcon>
                  <ActionIcon
                    size="md"
                    variant={reasoningFeedback === false ? "filled" : "outline"}
                    color="red"
                    style={{ opacity: reasoningFeedback === false ? 1 : 0.55 }}
                    onClick={() => onSetReasoningFeedback(false)}
                  >
                    <IconX size={18} />
                  </ActionIcon>
                </Group>
              </Group>
            </Stack>
          </Stack>
        </Paper>

        <Paper p="md" bg={surface3} radius="md">
          {(batchResult?.isCorrect === false || spanTextFeedback === false || reasoningFeedback === false) && (
            <Stack gap="xs">
              {batchResult?.isCorrect === false && (
                <>
                  <Group gap="xs" align="center">
                    <Text size="sm" fw={500}>
                      Task Labels:
                    </Text>
                    {infoIcon("Labels defined in the task definition stage")}
                    <Group gap={4}>
                      {labels.length > 0 ? (
                        labels.map((label) => (
                          <Tooltip
                            key={label.name}
                            withArrow
                            multiline
                            w={280}
                            label={label.description || label.definition || "No label description available."}
                          >
                            <Badge
                              variant="light"
                              color="gray"
                              style={{ cursor: "pointer" }}
                              onClick={() => onSetCorrectLabel(label.name)}
                            >
                              {label.name}
                            </Badge>
                          </Tooltip>
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
                    data={labels.map((l) => ({ value: l.name, label: l.name.toUpperCase() }))}
                    value={batchResult?.correctLabel ?? null}
                    onChange={(value) => onSetCorrectLabel(value ?? null)}
                    required
                    allowDeselect={false}
                  />
                </>
              )}
              <Textarea
                label="Feedback"
                mt={4}
                placeholder="Why was the AI wrong? (This will help the rule synthesizer)"
                variant="default"
                size="sm"
                value={batchResult?.feedback ?? ""}
                required
                onChange={(e) => onSetFeedback(e.currentTarget.value)}
              />
            </Stack>
          )}
        </Paper>
      </Stack>
    </Paper>
  );
}
