import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowRight,
  IconBook2,
  IconBraces,
  IconFileTypeCsv,
  IconUpload,
} from "@tabler/icons-react";
import { type ReactNode, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import StepTrackerBanner from "../components/StepTrackerBanner";
import GuidedTour, { GuidedTourStep } from "../components/common/GuidedTour";
import PageIntro, { usePageIntroTour } from "../components/common/PageIntro";
import {
  LABELS_TEMPLATE,
  TASK_TEMPLATE,
  modelOptions,
} from "../constants/datasetUpload.constants";
import { toast } from "../lib/toast";
import { createTask, uploadFile } from "../services/tasks.service";
import { csvToJson } from "../utils/csvUtil";
import { downloadContent } from "../utils/downloadContent";
import styles from "./DatasetUploadPage.module.css";

interface AnnotationTaskConfig {
  selectedModel: string | null;
  textColumn: string;
  labelColumn: string;
}

const defaultConfig: AnnotationTaskConfig = {
  selectedModel: "mistral:7b",
  textColumn: "translated_text",
  labelColumn: "Final Label",
};

const CODEBOOK_TEMPLATE = `# Codebook
If text indicates positive sentiment, label as positive.
If text indicates negative sentiment, label as negative.
If text does not fit any defined category, label as not relevant.
`;

interface RequiredFileCardProps {
  inputId: string;
  accept: string;
  icon: ReactNode;
  label: string;
  selectLabel: string;
  hint: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  templateAction?: {
    label: string;
    onClick: () => void;
  };
}

function RequiredFileCard({
  inputId,
  accept,
  icon,
  label,
  selectLabel,
  hint,
  file,
  onFileChange,
  templateAction,
}: RequiredFileCardProps) {
  return (
    <div className={styles.fileRow}>
      <input
        id={inputId}
        className={styles.fileInput}
        type="file"
        accept={accept}
        onChange={(event) => onFileChange(event.currentTarget.files?.[0] || null)}
      />
      <Group justify="space-between" w="100%" wrap="nowrap">
        <Group gap={8} wrap="nowrap">
          {icon}
          <Text fw={600} className={styles.fileLabel}>
            {label}
          </Text>
        </Group>
        <label htmlFor={inputId} className={styles.fileButton}>
          <IconUpload size={14} />
          {selectLabel}
        </label>
      </Group>
      <Text size="xs" className={styles.fileHint}>
        {hint}
      </Text>
      {templateAction ? (
        <Group className={styles.fileMetaRow} wrap="nowrap">
          <Text
            size="xs"
            className={`${styles.fileName} ${
              file ? styles.fileNameSelected : styles.fileNameMissing
            }`}
          >
            {file ? file.name : "No file selected"}
          </Text>
          <Button
            size="compact-xs"
            variant="light"
            className={styles.fileTemplateButton}
            onClick={templateAction.onClick}
          >
            {templateAction.label}
          </Button>
        </Group>
      ) : (
        <Text
          size="xs"
          className={`${styles.fileName} ${
            file ? styles.fileNameSelected : styles.fileNameMissing
          }`}
        >
          {file ? file.name : "No file selected"}
        </Text>
      )}
    </div>
  );
}

function parseTaskJson(raw: string): {
  name: string;
  description: string;
  type: "Multiclass" | "Single-class";
} {
  const parsed = JSON.parse(raw) as {
    taskname?: string;
    taskName?: string;
    name?: string;
    description?: string;
    type?: string;
  };

  const name = parsed.taskname || parsed.taskName || parsed.name || "";
  const description = parsed.description || "";
  const type: "Multiclass" | "Single-class" =
    parsed.type === "Single-class" ? "Single-class" : "Multiclass";

  if (!name.trim() || !description.trim()) {
    throw new Error("Task JSON must include taskname/name and description.");
  }

  return {
    name: name.trim(),
    description: description.trim(),
    type,
  };
}

function parseLabelsJson(raw: string) {
  const parsed = JSON.parse(raw) as {
    labels?: Array<{
      name?: string;
      description?: string;
      keywords?: string[];
      guidelines?: unknown;
    }>;
  };

  const labels = Array.isArray(parsed.labels) ? parsed.labels : [];
  if (labels.length === 0) {
    throw new Error("Labels JSON must include a non-empty labels array.");
  }

  return labels.map((label, index) => {
    const name = label.name?.trim() || "";
    const definition = label.description?.trim() || "";
    const keywords = Array.isArray(label.keywords)
      ? label.keywords.map((kw) => kw.trim()).filter(Boolean)
      : [];
    const guidelines = Array.isArray(label.guidelines)
      ? label.guidelines
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
          .join("\n")
      : typeof label.guidelines === "string"
        ? label.guidelines.trim()
        : undefined;

    if (!name || !definition || keywords.length === 0) {
      throw new Error(
        `Label ${index + 1} must include name, description, and keywords.`,
      );
    }

    return {
      name,
      definition,
      keywords,
      ...(guidelines ? { guidelines } : {}),
    };
  });
}

export default function NewAnnotationTaskPage() {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const isLight = colorScheme === "light";

  const [unlabeledFile, setUnlabeledFile] = useState<File | null>(null);
  const [codebookFile, setCodebookFile] = useState<File | null>(null);
  const [taskJsonFile, setTaskJsonFile] = useState<File | null>(null);
  const [labelsJsonFile, setLabelsJsonFile] = useState<File | null>(null);
  const [config, setConfig] = useState<AnnotationTaskConfig>(defaultConfig);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    introOpen,
    introMode,
    tourOpen,
    setIntroOpen,
    setTourOpen,
    openHelpIntro,
  } = usePageIntroTour("hideNewAnnotationIntro");

  const isReady = Boolean(
    unlabeledFile &&
      codebookFile &&
      taskJsonFile &&
      labelsJsonFile &&
      config.selectedModel &&
      config.textColumn &&
      config.labelColumn,
  );

  const dividerColor = isLight
    ? "rgba(15, 20, 24, 0.12)"
    : "rgba(255, 255, 255, 0.08)";

  const setConfigField = useCallback(
    <K extends keyof AnnotationTaskConfig>(key: K, value: AnnotationTaskConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setUnlabeledFile(null);
    setCodebookFile(null);
    setTaskJsonFile(null);
    setLabelsJsonFile(null);
    setConfig(defaultConfig);
    setError(null);
  }, []);

  const handleCreate = useCallback(async () => {
    if (
      !unlabeledFile ||
      !codebookFile ||
      !taskJsonFile ||
      !labelsJsonFile ||
      !config.selectedModel
    ) {
      setError("Please provide all required files and task config fields.");
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const [taskRaw, labelsRaw, codebookRaw, rows] = await Promise.all([
        taskJsonFile.text(),
        labelsJsonFile.text(),
        codebookFile.text(),
        csvToJson<Record<string, unknown>>(unlabeledFile),
      ]);

      const task = parseTaskJson(taskRaw);
      const labels = parseLabelsJson(labelsRaw);
      const columns =
        rows.length > 0 ? Object.keys(rows[0] || {}).filter(Boolean) : [];
      const codebook = codebookRaw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const upload = await uploadFile(unlabeledFile);
      if (!upload.success || !upload.filePath) {
        throw new Error(upload.message || "Failed to upload unlabeled dataset.");
      }

      const created = await createTask({
        name: task.name,
        description: task.description,
        type: task.type,
        labels,
        codebook,
        columns,
        file: upload.filePath,
        userID: "",
      });

      if (!created.success || !created.taskId) {
        throw new Error(created.message || "Failed to create annotation task.");
      }

      window.dispatchEvent(new Event("tasks:updated"));
      toast.success("Annotation task created.");
      navigate(`/annotate-dataset/${created.taskId}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to create annotation task.");
      } else {
        setError("Failed to create annotation task.");
      }
    } finally {
      setIsCreating(false);
    }
  }, [
    codebookFile,
    config.selectedModel,
    labelsJsonFile,
    navigate,
    taskJsonFile,
    unlabeledFile,
  ]);

  return (
    <Box
      className={styles.page}
      style={{ minHeight: "100dvh", overflowX: "hidden", overflowY: "auto" }}
    >
      <div className={styles.orbOne} />
      <Container fluid className={styles.hero}>
        <StepTrackerBanner currentStep={1} onHelp={openHelpIntro} />
        <Group justify="space-between" align="center" wrap="nowrap">
          <Title className={styles.title}>Create Annotation Task</Title>
        </Group>
        <Text className={styles.subtitle}>
          Upload your codebook, unlabeled dataset, and task definition files to
          start dataset annotation.
        </Text>
      </Container>

      <Container
        fluid
        className={styles.tableSection}
        style={{ height: "auto", overflow: "visible" }}
      >
        <PageIntro
          mode={introMode}
          opened={introOpen}
          onClose={() => setIntroOpen(false)}
          title="Create annotation task"
          description="Set model and columns, upload required files, and create a task ready for dataset annotation."
          storageKey="hideNewAnnotationIntro"
          onStart={() => setTourOpen(true)}
        />

        <GuidedTour open={tourOpen} onClose={() => setTourOpen(false)}>
          <Stack gap="md">
            <Grid gutter="md" align="stretch">
              <Grid.Col span={{ base: 12, md: 7 }}>
                <Paper className={styles.dropCard} radius="lg" h="100%">
                  <Stack gap="sm">
                    <Title order={4} className={styles.tableTitle}>
                      Task config
                    </Title>
                    <Text size="sm" className={styles.tableMeta}>
                      Configure model and dataset columns before task creation.
                    </Text>
                    <Divider my={4} color={dividerColor} />
                    <Select
                      label="Model"
                      description="Choose the model to use for annotation."
                      placeholder="Select a model…"
                      value={config.selectedModel}
                      onChange={(value) => setConfigField("selectedModel", value)}
                      data={modelOptions}
                      classNames={{
                        label: styles.configLabel,
                        description: styles.configDescription,
                        input: styles.configInput,
                        dropdown: styles.configDropdown,
                      }}
                    />
                    <TextInput
                      label="Text column name"
                      description="Column in CSV that contains the text to annotate."
                      placeholder="e.g. text, translated_text, content…"
                      value={config.textColumn}
                      onChange={(event) =>
                        setConfigField("textColumn", event.currentTarget.value)
                      }
                      classNames={{
                        label: styles.configLabel,
                        description: styles.configDescription,
                        input: styles.configInput,
                      }}
                    />
                    <TextInput
                      label="Label column name"
                      description="Target label column used in the output."
                      placeholder="e.g. annotation_label, final_label"
                      value={config.labelColumn}
                      onChange={(event) =>
                        setConfigField("labelColumn", event.currentTarget.value)
                      }
                      classNames={{
                        label: styles.configLabel,
                        description: styles.configDescription,
                        input: styles.configInput,
                      }}
                    />
                  </Stack>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 5 }}>
                <Paper className={styles.dropCard} radius="lg" h="100%">
                  <Stack gap="sm">
                    <Title order={4} className={styles.tableTitle}>
                      Required files
                    </Title>
                    <Text size="sm" className={styles.tableMeta}>
                      Upload one CSV, two JSON files, and a codebook text file.
                    </Text>
                    <Divider my={4} color={dividerColor} />

                    <GuidedTourStep
                      order={1}
                      title="Upload codebook file"
                      description="Provide a text file containing codebook rules."
                    >
                      <RequiredFileCard
                        inputId="codebook-txt"
                        accept=".txt,.md,text/plain,text/markdown"
                        icon={<IconBook2 size={18} />}
                        label="Codebook file"
                        selectLabel="Select file"
                        hint="Text or markdown file with one or more rules"
                        file={codebookFile}
                        onFileChange={setCodebookFile}
                        templateAction={{
                          label: "Download template",
                          onClick: () =>
                            downloadContent("codebook.txt", CODEBOOK_TEMPLATE),
                        }}
                      />
                    </GuidedTourStep>

                    <GuidedTourStep
                      order={2}
                      title="Upload unlabeled data"
                      description='The dataset to annotate. Must include the configured text column.'
                    >
                      <RequiredFileCard
                        inputId="annotate-unlabeled-dataset"
                        accept=".csv,text/csv"
                        icon={<IconFileTypeCsv size={18} />}
                        label="Unlabeled dataset"
                        selectLabel="Select CSV"
                        hint="CSV with text column for annotation"
                        file={unlabeledFile}
                        onFileChange={setUnlabeledFile}
                      />
                    </GuidedTourStep>

                    <GuidedTourStep
                      order={3}
                      title="Task details"
                      description="Provide task name and description in JSON."
                    >
                      <RequiredFileCard
                        inputId="annotate-task-json"
                        accept=".json,application/json"
                        icon={<IconBraces size={18} />}
                        label="Task details"
                        selectLabel="Select JSON"
                        hint="JSON with taskname + description"
                        file={taskJsonFile}
                        onFileChange={setTaskJsonFile}
                        templateAction={{
                          label: "Download template",
                          onClick: () => downloadContent("task.json", TASK_TEMPLATE),
                        }}
                      />
                    </GuidedTourStep>

                    <GuidedTourStep
                      order={4}
                      title="Labels JSON"
                      description="Provide label definitions and keywords."
                    >
                      <RequiredFileCard
                        inputId="annotate-labels-json"
                        accept=".json,application/json"
                        icon={<IconBraces size={18} />}
                        label="Label set"
                        selectLabel="Select JSON"
                        hint="JSON labels with name, description, keywords"
                        file={labelsJsonFile}
                        onFileChange={setLabelsJsonFile}
                        templateAction={{
                          label: "Download template",
                          onClick: () =>
                            downloadContent("labels.json", LABELS_TEMPLATE),
                        }}
                      />
                    </GuidedTourStep>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                {error}
              </Alert>
            )}

            <Group justify="space-between" mt={2}>
              <Button
                variant="light"
                className={styles.secondaryCta}
                onClick={handleReset}
              >
                Reset
              </Button>
              <GuidedTourStep
                order={5}
                title="Create task"
                description="Create the annotation task when all required files are selected."
                position="top"
              >
                <Button
                  className={styles.primaryCta}
                  leftSection={<IconUpload size={18} />}
                  rightSection={<IconArrowRight size={16} />}
                  loading={isCreating}
                  disabled={!isReady}
                  onClick={handleCreate}
                >
                  Create annotation task
                </Button>
              </GuidedTourStep>
            </Group>
          </Stack>
        </GuidedTour>
      </Container>
    </Box>
  );
}
