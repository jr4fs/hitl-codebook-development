import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
  Popover,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowRight,
  IconBraces,
  IconFileTypeCsv,
  IconHelpCircle,
  IconUpload,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import StepTrackerBanner from "../components/StepTrackerBanner";
import { uploadTaskBundle } from "../services/tasks.service";
import { toast } from "../lib/toast";
import styles from "./DatasetUploadPage.module.css";

export default function DatasetUploadPage() {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const isLight = colorScheme === "light";
  const [dValFile, setDValFile] = useState<File | null>(null);
  const [dAllFile, setDAllFile] = useState<File | null>(null);
  const [taskJsonFile, setTaskJsonFile] = useState<File | null>(null);
  const [labelsJsonFile, setLabelsJsonFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(
    "mistral:7b",
  );
  const [textColumn, setTextColumn] = useState("translated_text");
  const [labelColumn, setLabelColumn] = useState("Final Label");
  const [coverageSampleSize, setCoverageSampleSize] = useState<number | "">(
    150,
  );
  const [useRepresentativeSampling, setUseRepresentativeSampling] =
    useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [introDontShow, setIntroDontShow] = useState(false);
  const [introShowCheckbox, setIntroShowCheckbox] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const labeledRef = useRef<HTMLDivElement | null>(null);
  const unlabeledRef = useRef<HTMLDivElement | null>(null);
  const taskJsonRef = useRef<HTMLDivElement | null>(null);
  const labelsJsonRef = useRef<HTMLDivElement | null>(null);
  const submitRef = useRef<HTMLDivElement | null>(null);

  const isReady = Boolean(
    dValFile && dAllFile && taskJsonFile && labelsJsonFile,
  );

  useEffect(() => {
    const hideIntro = localStorage.getItem("hideStep1Intro") === "true";
    const hideTour = localStorage.getItem("hideStep1Tour") === "true";
    if (!hideIntro) {
      setIntroShowCheckbox(true);
      setIntroOpen(true);
    } else if (!hideTour) {
      setTourOpen(true);
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

  const startTour = () => {
    setTourStep(0);
    setTourOpen(true);
  };

  const endTour = (hideFuture: boolean) => {
    if (hideFuture) {
      localStorage.setItem("hideStep1Tour", "true");
    }
    setTourOpen(false);
  };

  const tourSteps = useMemo(
    () => [
      {
        title: "Upload labeled data",
        description:
          'A subset of the dataset with labels. It should include "text" and "task_label" columns.',
        ref: labeledRef,
      },
      {
        title: "Upload unlabeled data",
        description:
          'The remaining dataset without labels. It should include a "text".',
        ref: unlabeledRef,
      },
      {
        title: "Task details",
        description: "Provide the task name and description in JSON.",
        ref: taskJsonRef,
      },
      {
        title: "Labels JSON",
        description:
          "Provide the label list with name, description, keywords, and guidelines.",
        ref: labelsJsonRef,
      },
      {
        title: "Start the upload",
        description: "When all files are selected, upload to continue.",
        ref: submitRef,
      },
    ],
    [],
  );

  useEffect(() => {
    if (!tourOpen) return;
    const currentStep = tourSteps[tourStep];
    const target = currentStep?.ref?.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (inView) return;

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [tourOpen, tourStep, tourSteps]);

  const handleReset = () => {
    setDValFile(null);
    setDAllFile(null);
    setTaskJsonFile(null);
    setLabelsJsonFile(null);
    setSelectedModel("mistral:7b");
    setTextColumn("translated_text");
    setLabelColumn("Final Label");
    setCoverageSampleSize(150);
    setUseRepresentativeSampling(false);
    setError(null);
  };

  const downloadTemplate = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const taskTemplate = JSON.stringify(
    {
      taskname: "INSERT_TASK_NAME_HERE",
      description:
        "Provide clear, step-by-step instructions explaining how to perform this task. Write the description as if you are teaching someone for the first time. Include the objective, and any necessary context, this will go straight into the prompt of the language model",
    },
    null,
    2,
  );

  const labelsTemplate = JSON.stringify(
    {
      labels: [
        {
          name: "positive",
          description: "INSERT DEFINITION",
          keywords: ["INSERT YOUR KEYWORDS"],
          guidelines: [
            "Any initial guidelines you have created for annotating this label",
          ],
        },
        {
          name: "negative",
          description: "INSERT DEFINITION",
          keywords: ["INSERT YOUR KEYWORDS"],
          guidelines: [
            "Any initial guidelines you have created for annotating this label",
          ],
        },
        {
          name: "neutral",
          description: "INSERT DEFINITION",
          keywords: ["INSERT YOUR KEYWORDS"],
          guidelines: [
            "Any initial guidelines you have created for annotating this label",
          ],
        },
      ],
    },
    null,
    2,
  );

  const introModalStyles = {
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
  } as const;

  const introOverlayColor = isLight ? "#f7fafb" : "#11171c";
  const dividerColor = isLight
    ? "rgba(15, 20, 24, 0.12)"
    : "rgba(255, 255, 255, 0.08)";
  const handleUpload = async () => {
    if (
      !dValFile ||
      !dAllFile ||
      !taskJsonFile ||
      !labelsJsonFile ||
      !labelColumn ||
      !selectedModel
    ) {
      setError(
        "Please provide all four files and label column as well as preferred model before continuing.",
      );
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
        textColumn,
        labelColumn,
        modelName: selectedModel ?? "",
        coverageN:
          typeof coverageSampleSize === "number" ? coverageSampleSize : 150,
        useRepresentativeSampling,
      });

      if (!response.success || !response.taskId) {
        throw new Error(response.message || "Upload failed.");
      }

      if (response.valSummary && response.restSummary) {
        toast.success(
          `Task created. Sampling is pending. Labeled rows: ${response.valSummary.rows}. Unlabeled rows: ${response.restSummary.rows}.`,
        );
      } else {
        toast.success("Task created. Sampling is pending.");
      }
      window.dispatchEvent(new Event("tasks:updated"));
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
    <Box
      className={styles.page}
      style={{ minHeight: "100dvh", overflowX: "hidden", overflowY: "auto" }}
    >
      <div className={styles.orbOne} />
      <Container fluid className={styles.hero}>
        <Badge className={styles.kicker} variant="light" color="gray">
          New Task Setup
        </Badge>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Title className={styles.title}>Upload Your Task Files</Title>
          <ActionIcon
            variant="subtle"
            size="lg"
            radius="xl"
            aria-label="Open upload help"
            onClick={handleHelp}
          >
            <IconHelpCircle size={20} />
          </ActionIcon>
        </Group>
        <Text className={styles.subtitle}>
          Upload your labeled examples, the remaining unlabeled data, and the
          task definition files to get started.
        </Text>
      </Container>
      <Container
        fluid
        className={styles.tableSection}
        style={{ height: "auto", overflow: "visible" }}
      >
        <StepTrackerBanner currentStep={1} onHelp={handleHelp} />
        <Modal
          opened={introOpen}
          onClose={handleCloseIntro}
          centered
          title="Step 1: Upload your task files"
          overlayProps={{ blur: 2, opacity: 0.5, color: introOverlayColor }}
          styles={introModalStyles}
        >
          <Stack gap="sm">
            <Text>
              Upload the labeled dataset, the unlabeled dataset, and the two
              JSON files. We will validate and move you to AI review.
            </Text>
            {introShowCheckbox && (
              <Checkbox
                className={styles.introCheckbox}
                label="Don't show again"
                checked={introDontShow}
                onChange={(event) =>
                  setIntroDontShow(event.currentTarget.checked)
                }
              />
            )}
            <Group justify="space-between" mt={10}>
              <Button
                variant="outline"
                onClick={() => {
                  handleCloseIntro();
                  endTour(true);
                }}
              >
                Skip tour
              </Button>
              <Button
                variant="light"
                leftSection={<IconHelpCircle size={16} />}
                onClick={() => {
                  handleCloseIntro();
                  startTour();
                }}
              >
                Start tour
              </Button>
            </Group>
          </Stack>
        </Modal>
        <Stack gap="md">
          <Grid gutter="md" align="stretch">
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Paper className={styles.dropCard} radius="lg" h="100%">
                <Stack gap="sm">
                  <Title order={4} className={styles.tableTitle}>
                    Task config
                  </Title>
                  <Text size="sm" className={styles.tableMeta}>
                    Configure model and dataset columns before upload.
                  </Text>
                  <Divider my={4} color={dividerColor} />
                  <NumberInput
                    label="Coverage sample size"
                    description="How many samples to include in the guide set. 150 by default."
                    value={coverageSampleSize}
                    min={1}
                    onChange={(value) =>
                      setCoverageSampleSize(typeof value === "number" ? value : "")
                    }
                    styles={{
                      label: {
                        color: isLight ? "#0f1418" : "#e8eef1",
                        fontWeight: 600,
                      },
                      description: {
                        color: isLight
                          ? "rgba(15,20,24,0.6)"
                          : "rgba(232,238,241,0.6)",
                      },
                      input: {
                        background: isLight ? "#ffffff" : "rgba(12, 18, 23, 0.8)",
                        border: isLight
                          ? "1px solid rgba(124, 231, 225, 0.55)"
                          : "1px solid rgba(124, 231, 225, 0.3)",
                        color: isLight ? "#0f1418" : "#e8eef1",
                        borderRadius: 10,
                      },
                    }}
                  />
                  <Switch
                    label="Enable representative sampling"
                    description="Off by default for this pilot. When enabled, we run representative sampling before coverage."
                    checked={useRepresentativeSampling}
                    onChange={(event) =>
                      setUseRepresentativeSampling(event.currentTarget.checked)
                    }
                    styles={{
                      label: {
                        color: isLight ? "#0f1418" : "#e8eef1",
                        fontWeight: 600,
                      },
                      description: {
                        color: isLight
                          ? "rgba(15,20,24,0.6)"
                          : "rgba(232,238,241,0.6)",
                      },
                    }}
                  />
                  <Select
                    label="Model"
                    description="Choose the model to use for AI annotation."
                    placeholder="Select a model…"
                    value={selectedModel}
                    onChange={setSelectedModel}
                    data={[
                      { value: "gemma3:1b", label: "Gemma3-1B" },
                      { value: "qwen3.5:2b", label: "Qwen3.5-2B" },
                      { value: "mistral:7b", label: "Mistral-7B" },
                      { value: "qwen:32b", label: "Qwen-32B" },
                      { value: "llama3.3:70b", label: "Llama3.3-70B" },
                    ]}
                    styles={{
                      label: {
                        color: isLight ? "#0f1418" : "#e8eef1",
                        fontWeight: 600,
                      },
                      description: {
                        color: isLight
                          ? "rgba(15,20,24,0.6)"
                          : "rgba(232,238,241,0.6)",
                      },
                      input: {
                        background: isLight ? "#ffffff" : "rgba(12, 18, 23, 0.8)",
                        border: isLight
                          ? "1px solid rgba(124, 231, 225, 0.55)"
                          : "1px solid rgba(124, 231, 225, 0.3)",
                        color: isLight ? "#0f1418" : "#e8eef1",
                        borderRadius: 10,
                      },
                      dropdown: {
                        background: isLight ? "#ffffff" : "rgba(18, 24, 29, 0.98)",
                        border: isLight
                          ? "1px solid rgba(124, 231, 225, 0.4)"
                          : "1px solid rgba(124, 231, 225, 0.3)",
                        color: isLight ? "#0f1418" : "#e8eef1",
                      },
                    }}
                  />
                  <TextInput
                    label="Text column name"
                    description="The column in your CSV that contains the text to annotate."
                    placeholder="e.g. text, translated_text, content…"
                    value={textColumn}
                    onChange={(e) => setTextColumn(e.currentTarget.value)}
                    styles={{
                      label: {
                        color: isLight ? "#0f1418" : "#e8eef1",
                        fontWeight: 600,
                      },
                      description: {
                        color: isLight
                          ? "rgba(15,20,24,0.6)"
                          : "rgba(232,238,241,0.6)",
                      },
                      input: {
                        background: isLight ? "#ffffff" : "rgba(12, 18, 23, 0.8)",
                        border: isLight
                          ? "1px solid rgba(124, 231, 225, 0.55)"
                          : "1px solid rgba(124, 231, 225, 0.3)",
                        color: isLight ? "#0f1418" : "#e8eef1",
                        borderRadius: 10,
                      },
                    }}
                  />
                  <TextInput
                    label="Label column name"
                    description="The column in your CSV that contains the human-annotated labels."
                    placeholder="e.g. annotations, final label, labels"
                    value={labelColumn}
                    onChange={(e) => setLabelColumn(e.currentTarget.value)}
                    styles={{
                      label: {
                        color: isLight ? "#0f1418" : "#e8eef1",
                        fontWeight: 600,
                      },
                      description: {
                        color: isLight
                          ? "rgba(15,20,24,0.6)"
                          : "rgba(232,238,241,0.6)",
                      },
                      input: {
                        background: isLight ? "#ffffff" : "rgba(12, 18, 23, 0.8)",
                        border: isLight
                          ? "1px solid rgba(124, 231, 225, 0.55)"
                          : "1px solid rgba(124, 231, 225, 0.3)",
                        color: isLight ? "#0f1418" : "#e8eef1",
                        borderRadius: 10,
                      },
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
                    Upload both CSVs and both JSON files to continue.
                  </Text>
                  <Divider my={4} color={dividerColor} />

                  <Popover
                    opened={tourOpen && tourStep === 0}
                    position="right"
                    withArrow
                    withinPortal
                    shadow="md"
                  >
                    <Popover.Target>
                      <div
                        ref={labeledRef}
                        className={`${styles.fileRow} ${tourOpen && tourStep === 0 ? styles.tourHighlight : ""}`}
                      >
                    <input
                      id="labeled-dataset"
                      className={styles.fileInput}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) =>
                        setDValFile(event.currentTarget.files?.[0] || null)
                      }
                    />
                    <Group justify="space-between" w="100%" wrap="nowrap">
                      <Group gap={8} wrap="nowrap">
                        <IconFileTypeCsv size={18} />
                        <Text fw={600} className={styles.fileLabel}>
                          Labeled dataset
                        </Text>
                      </Group>
                      <label htmlFor="labeled-dataset" className={styles.fileButton}>
                        <IconUpload size={14} />
                        Select CSV
                      </label>
                    </Group>
                    <Text size="xs" className={styles.fileHint}>
                      CSV with text + task_label columns
                    </Text>
                    <Text
                      size="xs"
                      className={`${styles.fileName} ${
                        dValFile ? styles.fileNameSelected : styles.fileNameMissing
                      }`}
                    >
                      {dValFile ? dValFile.name : "No file selected"}
                    </Text>
                      </div>
                    </Popover.Target>
                    <Popover.Dropdown className={styles.tourBubble}>
                      <Stack gap="xs">
                        <Text fw={600}>{tourSteps[0].title}</Text>
                        <Text size="sm" c="dimmed">
                          {tourSteps[0].description}
                        </Text>
                        <Group justify="space-between">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => endTour(true)}
                          >
                            Skip
                          </Button>
                          <Button size="xs" onClick={() => setTourStep(1)}>
                            Next
                          </Button>
                        </Group>
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>

                  <Popover
                    opened={tourOpen && tourStep === 1}
                    position="right"
                    withArrow
                    withinPortal
                    shadow="md"
                  >
                    <Popover.Target>
                      <div
                        ref={unlabeledRef}
                        className={`${styles.fileRow} ${tourOpen && tourStep === 1 ? styles.tourHighlight : ""}`}
                      >
                    <input
                      id="unlabeled-dataset"
                      className={styles.fileInput}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) =>
                        setDAllFile(event.currentTarget.files?.[0] || null)
                      }
                    />
                    <Group justify="space-between" w="100%" wrap="nowrap">
                      <Group gap={8} wrap="nowrap">
                        <IconFileTypeCsv size={18} />
                        <Text fw={600} className={styles.fileLabel}>
                          Unlabeled dataset
                        </Text>
                      </Group>
                      <label htmlFor="unlabeled-dataset" className={styles.fileButton}>
                        <IconUpload size={14} />
                        Select CSV
                      </label>
                    </Group>
                    <Text size="xs" className={styles.fileHint}>
                      CSV with text column only
                    </Text>
                    <Text
                      size="xs"
                      className={`${styles.fileName} ${
                        dAllFile ? styles.fileNameSelected : styles.fileNameMissing
                      }`}
                    >
                      {dAllFile ? dAllFile.name : "No file selected"}
                    </Text>
                      </div>
                    </Popover.Target>
                    <Popover.Dropdown className={styles.tourBubble}>
                      <Stack gap="xs">
                        <Text fw={600}>{tourSteps[1].title}</Text>
                        <Text size="sm" c="dimmed">
                          {tourSteps[1].description}
                        </Text>
                        <Group justify="space-between">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => endTour(true)}
                          >
                            Skip
                          </Button>
                          <Button size="xs" onClick={() => setTourStep(2)}>
                            Next
                          </Button>
                        </Group>
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>

                  <Popover
                    opened={tourOpen && tourStep === 2}
                    position="right"
                    withArrow
                    withinPortal
                    shadow="md"
                  >
                    <Popover.Target>
                      <div
                        ref={taskJsonRef}
                        className={`${styles.fileRow} ${tourOpen && tourStep === 2 ? styles.tourHighlight : ""}`}
                      >
                    <input
                      id="task-json"
                      className={styles.fileInput}
                      type="file"
                      accept=".json,application/json"
                      onChange={(event) =>
                        setTaskJsonFile(event.currentTarget.files?.[0] || null)
                      }
                    />
                    <Group justify="space-between" w="100%" wrap="nowrap">
                      <Group gap={8} wrap="nowrap">
                        <IconBraces size={18} />
                        <Text fw={600} className={styles.fileLabel}>
                          Task details
                        </Text>
                      </Group>
                      <label htmlFor="task-json" className={styles.fileButton}>
                        <IconUpload size={14} />
                        Select JSON
                      </label>
                    </Group>
                    <Text size="xs" className={styles.fileHint}>
                      JSON with taskname + description
                    </Text>
                    <Group className={styles.fileMetaRow} wrap="nowrap">
                      <Text
                        size="xs"
                        className={`${styles.fileName} ${
                          taskJsonFile
                            ? styles.fileNameSelected
                            : styles.fileNameMissing
                        }`}
                      >
                        {taskJsonFile ? taskJsonFile.name : "No file selected"}
                      </Text>
                      <Button
                        size="compact-xs"
                        variant="light"
                        className={styles.fileTemplateButton}
                        onClick={() => downloadTemplate("task.json", taskTemplate)}
                      >
                        Download template
                      </Button>
                    </Group>
                      </div>
                    </Popover.Target>
                    <Popover.Dropdown className={styles.tourBubble}>
                      <Stack gap="xs">
                        <Text fw={600}>{tourSteps[2].title}</Text>
                        <Text size="sm" c="dimmed">
                          {tourSteps[2].description}
                        </Text>
                        <Group justify="space-between">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => endTour(true)}
                          >
                            Skip
                          </Button>
                          <Button size="xs" onClick={() => setTourStep(3)}>
                            Next
                          </Button>
                        </Group>
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>

                  <Popover
                    opened={tourOpen && tourStep === 3}
                    position="right"
                    withArrow
                    withinPortal
                    shadow="md"
                  >
                    <Popover.Target>
                      <div
                        ref={labelsJsonRef}
                        className={`${styles.fileRow} ${tourOpen && tourStep === 3 ? styles.tourHighlight : ""}`}
                      >
                    <input
                      id="labels-json"
                      className={styles.fileInput}
                      type="file"
                      accept=".json,application/json"
                      onChange={(event) =>
                        setLabelsJsonFile(
                          event.currentTarget.files?.[0] || null,
                        )
                      }
                    />
                    <Group justify="space-between" w="100%" wrap="nowrap">
                      <Group gap={8} wrap="nowrap">
                        <IconBraces size={18} />
                        <Text fw={600} className={styles.fileLabel}>
                          Label set
                        </Text>
                      </Group>
                      <label htmlFor="labels-json" className={styles.fileButton}>
                        <IconUpload size={14} />
                        Select JSON
                      </label>
                    </Group>
                    <Text size="xs" className={styles.fileHint}>
                      JSON labels with name, keywords, guidelines
                    </Text>
                    <Group className={styles.fileMetaRow} wrap="nowrap">
                      <Text
                        size="xs"
                        className={`${styles.fileName} ${
                          labelsJsonFile
                            ? styles.fileNameSelected
                            : styles.fileNameMissing
                        }`}
                      >
                        {labelsJsonFile ? labelsJsonFile.name : "No file selected"}
                      </Text>
                      <Button
                        size="compact-xs"
                        variant="light"
                        className={styles.fileTemplateButton}
                        onClick={() =>
                          downloadTemplate("labels.json", labelsTemplate)
                        }
                      >
                        Download template
                      </Button>
                    </Group>
                      </div>
                    </Popover.Target>
                    <Popover.Dropdown className={styles.tourBubble}>
                      <Stack gap="xs">
                        <Text fw={600}>{tourSteps[3].title}</Text>
                        <Text size="sm" c="dimmed">
                          {tourSteps[3].description}
                        </Text>
                        <Group justify="space-between">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => endTour(true)}
                          >
                            Skip
                          </Button>
                          <Button size="xs" onClick={() => setTourStep(4)}>
                            Next
                          </Button>
                        </Group>
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {error}
            </Alert>
          )}

          <Popover
            opened={tourOpen && tourStep === 4}
            position="top"
            withArrow
            withinPortal
            shadow="md"
          >
            <Popover.Target>
              <Group justify="space-between" mt={2}>
                <Button
                  variant="light"
                  className={styles.secondaryCta}
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <div
                  ref={submitRef}
                  className={tourOpen && tourStep === 4 ? styles.tourHighlight : ""}
                >
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
                </div>
              </Group>
            </Popover.Target>
            <Popover.Dropdown className={styles.tourBubble}>
              <Stack gap="xs">
                <Text fw={600}>{tourSteps[4].title}</Text>
                <Text size="sm" c="dimmed">
                  {tourSteps[4].description}
                </Text>
                <Group justify="space-between">
                  <Button variant="outline" size="xs" onClick={() => endTour(true)}>
                    Skip
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => {
                      endTour(true);
                    }}
                  >
                    Finish
                  </Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Stack>
      </Container>
    </Box>
  );
}
