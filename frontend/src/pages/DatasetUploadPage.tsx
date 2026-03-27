import {
  Box,
  Button,
  Container,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
  Checkbox,
  TextInput,
  FileInput,
  Alert,
  LoadingOverlay,
  Loader,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowRight,
  IconUpload,
  IconX,
  IconSettings,
  IconFile,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTask, getCsvData, uploadFile } from "../services/tasks.service";
import AnonymizeConfigModal from "../components/anonymize/AnonymizeConfigModal";
import StepTrackerBanner from "../components/StepTrackerBanner";
import styles from "./DatasetUploadPage.module.css";
import { embedDataset } from "../services/embedding.service";
import { LabelItem } from "@common/types/tasks";

export default function DatasetUploadPage() {
  const navigate = useNavigate();
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [taskJsonFile, setTaskJsonFile] = useState<File | null>(null);
  const [labelsJsonFile, setLabelsJsonFile] = useState<File | null>(null);
  const [taskJson, setTaskJson] = useState<{
    taskname?: string;
    description?: string;
  } | null>(null);
  const [labelsJson, setLabelsJson] = useState<{ labels?: LabelItem[] } | null>(
    null,
  );
  const [textColumn, setTextColumn] = useState("");
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [introDontShow, setIntroDontShow] = useState(false);
  const [introShowCheckbox, setIntroShowCheckbox] = useState(true);
  const [
    configModalOpened,
    { open: openConfigModal, close: closeConfigModal },
  ] = useDisclosure(false);

  const handleCsvUpload = async (file: File | null) => {
    if (!file) return;
    setCsvFile(file);
    setError(null);
    setIsUploadingCsv(true);
    try {
      const response = await uploadFile(file);
      if (!response.success) {
        throw new Error(response.message || "Failed to upload CSV");
      }
      const uploadedFileName = response.filePath ?? "";
      setFileName(uploadedFileName);
      const csvResponse = await getCsvData(uploadedFileName);
      setHeaders(csvResponse.headers || []);
    } catch (err: any) {
      setError(err?.message || "Failed to upload CSV");
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const readJsonFile = async <T,>(file: File): Promise<T> => {
    const text = await file.text();
    return JSON.parse(text) as T;
  };

  const handleTaskJsonUpload = async (file: File | null) => {
    setTaskJsonFile(file);
    setTaskJson(null);
    if (!file) return;
    setError(null);
    try {
      const parsed = await readJsonFile<{
        taskname?: string;
        description?: string;
      }>(file);
      setTaskJson(parsed);
    } catch (err: any) {
      setError(err?.message || "Invalid task.json file");
    }
  };

  const handleLabelsJsonUpload = async (file: File | null) => {
    setLabelsJsonFile(file);
    setLabelsJson(null);
    if (!file) return;
    setError(null);
    try {
      const parsed = await readJsonFile<{ labels?: LabelItem[] }>(file);
      setLabelsJson(parsed);
    } catch (err: any) {
      setError(err?.message || "Invalid labels.json file");
    }
  };

  useEffect(() => {
    const hideIntro = localStorage.getItem("hideStep1Intro") === "true";
    if (!hideIntro) {
      setIntroShowCheckbox(true);
      setIntroOpen(true);
    }
  }, []);

  const handleCloseIntro = () => {
    if (introShowCheckbox && introDontShow) {
      localStorage.setItem("hideStep1Intro", "true");
    }
    setIntroOpen(false);
  };

  const handleHelp = () => {
    setIntroShowCheckbox(false);
    setIntroOpen(true);
  };

  const hasRequiredInputs =
    Boolean(fileName) &&
    Boolean(taskJson?.taskname?.trim()) &&
    Boolean(taskJson?.description?.trim()) &&
    Array.isArray(labelsJson?.labels) &&
    (labelsJson?.labels?.length || 0) > 0 &&
    Boolean(textColumn.trim());

  const handleStartManualAnnotation = async () => {
    if (!hasRequiredInputs || isStarting) return;
    if (!taskJson || !labelsJson?.labels) {
      setError("Please provide valid task and labels JSON files");
      return;
    }

    if (headers.length > 0 && !headers.includes(textColumn)) {
      setError(`Missing column in CSV: ${textColumn}`);
      return;
    }

    const sanitizedLabels = labelsJson.labels
      .filter((label) => label.name?.trim())
      .map((label) => {
        const descriptionLabel = label as LabelItem & {
          description?: string;
          guidelines?: string[] | string;
        };
        const definition =
          label.definition || descriptionLabel.description || "";
        const keywords = Array.isArray(label.keywords)
          ? label.keywords
          : Array.isArray(descriptionLabel.guidelines)
            ? descriptionLabel.guidelines
            : typeof descriptionLabel.guidelines === "string"
              ? descriptionLabel.guidelines
                  .split(/[\n,;]+/)
                  .map((value) => value.trim())
                  .filter(Boolean)
              : [];

        return {
          name: label.name.trim(),
          definition,
          keywords,
        };
      });

    const invalidLabels = sanitizedLabels.filter(
      (label) => !label.definition.trim() || label.keywords.length === 0,
    );
    if (invalidLabels.length > 0) {
      setError("Each label must include a definition and at least one keyword");
      return;
    }

    if (sanitizedLabels.length === 0) {
      setError("labels.json must include at least one label");
      return;
    }

    setIsStarting(true);
    setError(null);
    try {
      const createResponse = await createTask({
        name: taskJson.taskname || "",
        description: taskJson.description || "",
        type: "Multiclass",
        labels: sanitizedLabels,
        columns: [textColumn],
        file: fileName,
        userID: "",
      });

      if (!createResponse.success || !createResponse.taskId) {
        throw new Error(createResponse.message || "Failed to create task");
      }

      const embedResponse = await embedDataset({
        file_path: fileName,
        text_col: [textColumn],
        labels: sanitizedLabels,
      });

      if (!embedResponse.success) {
        throw new Error("Failed to run subsampling");
      }

      navigate(`/manual-annotate/${createResponse.taskId}`, {
        state: {
          fileName,
          task: {
            _id: createResponse.taskId,
            name: taskJson.taskname,
            description: taskJson.description,
            type: "Multiclass",
            labels: sanitizedLabels,
            columns: [textColumn],
            file: fileName,
            createdAt: new Date().toISOString(),
          },
          subsampledCsv: embedResponse.val_data || [],
        },
      });
    } catch (err: any) {
      setError(err?.message || "Failed to start manual annotation");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Box className={styles.page}>
      <div className={styles.orbOne} />
      <Modal
        opened={introOpen}
        onClose={handleCloseIntro}
        centered
        title="Step 1: Upload files and setup"
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
          close: {
            color: "#e8eef1",
            backgroundColor: "transparent",
            transition: "background-color 120ms ease, color 120ms ease",
            "&:hover": {
              backgroundColor: "rgba(124, 231, 225, 0.12)",
              color: "#e8eef1",
            },
          },
        }}
      >
        <Stack gap="sm">
          <Text>
            Upload the dataset CSV plus task and labels JSON, then specify the
            text column so we can run subsampling.
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
      <LoadingOverlay
        visible={isStarting}
        zIndex={50}
        overlayProps={{ blur: 2, color: "rgba(15, 20, 24, 0.85)" }}
        loaderProps={{ color: "#7ce7e1" }}
      />
      <Container fluid className={styles.tableSection}>
        <StepTrackerBanner
          currentStep={1}
          onHelp={handleHelp}
          helpLabel="About this step"
        />
        <Group align="stretch" gap="xl" className={styles.formLayout}>
          <Paper className={styles.formCard} radius="lg">
            <Stack gap="md">
              <div>
                <Title order={3}>Required files</Title>
                <Text size="sm" c="dimmed">
                  Please upload the CSV and JSON files required to start the
                  process.
                </Text>
              </div>
              <Stack gap="sm">
                <FileInput
                  label="Dataset CSV"
                  description="CSV containing the text to annotate."
                  placeholder="E.g. dataset.csv"
                  value={csvFile}
                  onChange={handleCsvUpload}
                  accept=".csv,text/csv"
                  leftSection={<IconUpload size={16} />}
                  rightSection={
                    isUploadingCsv ? (
                      <Loader size={16} color="#7ce7e1" />
                    ) : undefined
                  }
                  styles={{
                    input: {
                      backgroundColor: "#1b242b",
                      borderColor: "#2c3a45",
                      color: "#e8eef1",
                    },
                    label: { color: "#e8eef1" },
                    description: { color: "rgba(232,238,241,0.6)" },
                  }}
                />
                <FileInput
                  label="Task JSON"
                  description="task.json with taskname and description."
                  placeholder="E.g. task.json"
                  value={taskJsonFile}
                  onChange={handleTaskJsonUpload}
                  accept="application/json"
                  leftSection={<IconFile size={16} />}
                  styles={{
                    input: {
                      backgroundColor: "#1b242b",
                      borderColor: "#2c3a45",
                      color: "#e8eef1",
                    },
                    label: { color: "#e8eef1" },
                    description: { color: "rgba(232,238,241,0.6)" },
                  }}
                />
                <FileInput
                  label="Labels JSON"
                  description="labels.json with label definitions and keywords."
                  placeholder="E.g. labels.json"
                  value={labelsJsonFile}
                  onChange={handleLabelsJsonUpload}
                  accept="application/json"
                  leftSection={<IconFile size={16} />}
                  styles={{
                    input: {
                      backgroundColor: "#1b242b",
                      borderColor: "#2c3a45",
                      color: "#e8eef1",
                    },
                    label: { color: "#e8eef1" },
                    description: { color: "rgba(232,238,241,0.6)" },
                  }}
                />
                <TextInput
                  label="Text column name"
                  description="Column name that contains the final text."
                  placeholder="E.g. translated_text"
                  value={textColumn}
                  onChange={(event) => setTextColumn(event.currentTarget.value)}
                  styles={{
                    input: {
                      backgroundColor: "#1b242b",
                      borderColor: "#2c3a45",
                      color: "#e8eef1",
                    },
                    label: { color: "#e8eef1" },
                    description: { color: "rgba(232,238,241,0.6)" },
                  }}
                />
                {error && (
                  <Alert color="red" title="Error" icon={<IconX size={16} />}>
                    {error}
                  </Alert>
                )}
                <Group justify="space-between" align="center" mt="xs">
                  <Button
                    variant="light"
                    radius="xl"
                    className={styles.secondaryCta}
                    leftSection={<IconSettings size={18} />}
                    onClick={openConfigModal}
                  >
                    Configure anonymization
                  </Button>
                  <Button
                    className={styles.primaryCta}
                    radius="xl"
                    rightSection={<IconArrowRight size={18} />}
                    disabled={
                      !hasRequiredInputs || isStarting || isUploadingCsv
                    }
                    onClick={handleStartManualAnnotation}
                    loading={isStarting}
                  >
                    Start manual annotation
                  </Button>
                </Group>
              </Stack>
            </Stack>
          </Paper>
          <Paper className={styles.infoCard} radius="lg">
            <Stack gap="md" align="center" justify="center">
              <div>
                <Title order={3}>What happens next</Title>
                <Text size="sm" c="dimmed">
                  We create your task, run subsampling, and directly take you to
                  the manual annotation step.
                </Text>
              </div>
              <Paper className={styles.uploadVisual} radius="xl" p="xl">
                <Stack align="center" gap="sm">
                  <IconUpload size={36} />
                  <Text fw={600}>3 files to upload</Text>
                </Stack>
              </Paper>
            </Stack>
          </Paper>
        </Group>
      </Container>
      <AnonymizeConfigModal
        opened={configModalOpened}
        onClose={closeConfigModal}
      />
    </Box>
  );
}
