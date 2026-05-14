import { Button, Modal, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { cancelValEval } from "../../../services/metrics.service";
import { MetricsFiles } from "../types";

interface MetricsModalProps {
  opened: boolean;
  isLight: boolean;
  files: MetricsFiles;
  onClose: () => void;
  onDownload: (filename?: string) => void;
  taskId?: string;
}

export function MetricsModal({ opened, isLight, files, onClose, onDownload, taskId }: MetricsModalProps) {
  const navigate = useNavigate();
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
        {taskId && (
          <Button
            fullWidth
            variant="filled"
            color="teal"
            onClick={async () => {
              try { await cancelValEval(taskId); } catch {}
              navigate(`/dashboard/${taskId}`);
            }}
          >
            Go to Dashboard
          </Button>
        )}
      </Stack>
    </Modal>
  );
}
