import { Button, Modal, Progress, Stack, Text } from "@mantine/core";
import { MetricsFiles } from "../types";

interface MetricsModalProps {
  opened: boolean;
  isLight: boolean;
  files: MetricsFiles;
  onClose: () => void;
  onDownload: (filename?: string) => void;
  onRunValEval: () => void;
  isRunningValEval: boolean;
  valEvalProgress: { completed: number; total: number };
}

export function MetricsModal({ opened, isLight, files, onClose, onDownload, onRunValEval, isRunningValEval, valEvalProgress }: MetricsModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
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
        <Text>Review completed! You can download the captured metrics below.</Text>
        <Button fullWidth variant="light" onClick={() => onDownload(files.sample)} disabled={!files.sample}>
          Download sample metrics
        </Button>
        <Button fullWidth variant="light" onClick={() => onDownload(files.batch)} disabled={!files.batch}>
          Download batch metrics
        </Button>
        <Button
          fullWidth
          variant="light"
          onClick={() => onDownload(files.metadata)}
          disabled={!files.metadata}
        >
          Download metadata metrics
        </Button>
        <Button
          fullWidth
          variant="filled"
          onClick={onRunValEval}
          loading={isRunningValEval}
          disabled={isRunningValEval}
        >
          Run validation evaluation
        </Button>
        {isRunningValEval && valEvalProgress.total > 0 && (
          <Stack gap={4}>
            <Progress
              value={(valEvalProgress.completed / valEvalProgress.total) * 100}
              animated
              size="sm"
            />
            <Text size="xs" c="dimmed" ta="center">
              {valEvalProgress.completed} / {valEvalProgress.total} samples evaluated
            </Text>
          </Stack>
        )}
        <Button
          fullWidth
          variant="light"
          onClick={() => onDownload(files.valEval)}
          disabled={!files.valEval}
        >
          Download val eval metrics
        </Button>
        <Button
          fullWidth
          variant="light"
          onClick={() => onDownload(files.valEvalPredictions)}
          disabled={!files.valEvalPredictions}
        >
          Download val eval predictions (per-sample)
        </Button>
      </Stack>
    </Modal>
  );
}
