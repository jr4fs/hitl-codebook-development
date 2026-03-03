import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowRight,
  IconUpload,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StepTrackerBanner from "../components/StepTrackerBanner";
import { uploadTaskBundle } from "../services/tasks.service";
import { toast } from "../lib/toast";
import styles from "./DatasetUploadPage.module.css";

export default function DatasetUploadPage() {
  const navigate = useNavigate();
  const [dValFile, setDValFile] = useState<File | null>(null);
  const [dAllFile, setDAllFile] = useState<File | null>(null);
  const [taskJsonFile, setTaskJsonFile] = useState<File | null>(null);
  const [labelsJsonFile, setLabelsJsonFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady = Boolean(
    dValFile && dAllFile && taskJsonFile && labelsJsonFile,
  );

  const handleUpload = async () => {
    if (!dValFile || !dAllFile || !taskJsonFile || !labelsJsonFile) {
      setError("Please provide all four files before continuing.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const response = await uploadTaskBundle({
        dValFile,
        dAllFile,
        taskJsonFile,
        labelsJsonFile,
      });

      if (!response.success || !response.taskId) {
        throw new Error(response.message || "Upload failed.");
      }

      if (response.valSummary && response.restSummary) {
        toast.success(
          `Upload complete. Labeled rows: ${response.valSummary.rows}. Unlabeled rows: ${response.restSummary.rows}.`,
        );
      } else {
        toast.success("Upload complete. Opening AI review...");
      }
      navigate(`/auto-annotate/${response.taskId}`, {
        state: {
          task: response.task,
          fileName: response.fileName,
        },
      });
    } catch (err: any) {
      setError(err?.message || "Failed to upload files.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box className={styles.page}>
      <div className={styles.orbOne} />
      <Container fluid className={styles.hero}>
        <Badge className={styles.kicker} variant="light" color="gray">
          New Task Setup
        </Badge>
        <Title className={styles.title}>Upload Your Task Files</Title>
        <Text className={styles.subtitle}>
          Upload your labeled examples, the remaining unlabeled data, and the
          task definition files to get started.
        </Text>
      </Container>

      <Container fluid className={styles.tableSection}>
        <StepTrackerBanner currentStep={1} />
        <Group align="flex-start" wrap="wrap" gap="lg" grow>
          <Paper className={styles.dropCard} radius="lg">
            <Stack gap="md">
              <Title order={4} className={styles.tableTitle}>
                Required files
              </Title>
              <Text size="sm" className={styles.tableMeta}>
                The labeled dataset should include columns:{" "}
                <strong>text</strong> and <strong>task_label</strong>. The
                unlabeled dataset contains the remaining rows with{" "}
                <strong>text</strong> only.
              </Text>

              <Stack gap="xs" className={styles.fileRow}>
                <input
                  id="labeled-dataset"
                  className={styles.fileInput}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) =>
                    setDValFile(event.currentTarget.files?.[0] || null)
                  }
                />
                <label htmlFor="labeled-dataset" className={styles.fileButton}>
                  Choose labeled dataset (CSV)
                </label>
                <Text size="xs" className={styles.fileName}>
                  {dValFile ? dValFile.name : "No file selected"}
                </Text>
                <Text size="xs" c="dimmed">
                  Labeled dataset with text + task_label columns.
                </Text>
              </Stack>

              <Stack gap="xs" className={styles.fileRow}>
                <input
                  id="unlabeled-dataset"
                  className={styles.fileInput}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) =>
                    setDAllFile(event.currentTarget.files?.[0] || null)
                  }
                />
                <label
                  htmlFor="unlabeled-dataset"
                  className={styles.fileButton}
                >
                  Choose unlabeled dataset (CSV)
                </label>
                <Text size="xs" className={styles.fileName}>
                  {dAllFile ? dAllFile.name : "No file selected"}
                </Text>
                <Text size="xs" c="dimmed">
                  Unlabeled dataset with text only.
                </Text>
              </Stack>

              <Divider my="sm" color="rgba(255, 255, 255, 0.08)" />

              <Stack gap="xs" className={styles.fileRow}>
                <input
                  id="task-json"
                  className={styles.fileInput}
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) =>
                    setTaskJsonFile(event.currentTarget.files?.[0] || null)
                  }
                />
                <label htmlFor="task-json" className={styles.fileButton}>
                  Choose task details (JSON)
                </label>
                <Text size="xs" className={styles.fileName}>
                  {taskJsonFile ? taskJsonFile.name : "No file selected"}
                </Text>
                <Text size="xs" c="dimmed">
                  Task JSON with taskname and description.
                </Text>
              </Stack>

              <Stack gap="xs" className={styles.fileRow}>
                <input
                  id="labels-json"
                  className={styles.fileInput}
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) =>
                    setLabelsJsonFile(event.currentTarget.files?.[0] || null)
                  }
                />
                <label htmlFor="labels-json" className={styles.fileButton}>
                  Choose label set (JSON)
                </label>
                <Text size="xs" className={styles.fileName}>
                  {labelsJsonFile ? labelsJsonFile.name : "No file selected"}
                </Text>
                <Text size="xs" c="dimmed">
                  Labels array with name, description, keywords, guidelines.
                </Text>
              </Stack>

              {error && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  variant="light"
                >
                  {error}
                </Alert>
              )}

              <Group justify="space-between" mt="sm">
                <Button
                  variant="light"
                  className={styles.secondaryCta}
                  onClick={() => navigate("/")}
                >
                  Back to home
                </Button>
                <Button
                  className={styles.primaryCta}
                  leftSection={<IconUpload size={18} />}
                  rightSection={<IconArrowRight size={16} />}
                  loading={isUploading}
                  disabled={!isReady}
                  onClick={handleUpload}
                >
                  Upload bundle
                </Button>
              </Group>
            </Stack>
          </Paper>

          <Paper className={styles.dropCard} radius="lg">
            <Stack gap="md">
              <Title order={4} className={styles.tableTitle}>
                What happens next
              </Title>
              <Text className={styles.tableMeta} size="sm">
                We create the task, store your datasets, and seed the model with
                your labeled examples. You will land directly in the AI review
                step to provide feedback and generate the codebook.
              </Text>
              <Paper className={styles.infoCard} p="xl" radius="lg">
                <Stack align="center" gap="xs">
                  <IconUpload size={36} className={styles.iconIdle} />
                  <Text className={styles.dropTitle}>4 files, one launch</Text>
                  <Text className={styles.dropHint}>
                    We will validate the files and take you to review the AI
                    annotations.
                  </Text>
                </Stack>
              </Paper>
            </Stack>
          </Paper>
        </Group>
      </Container>
    </Box>
  );
}
