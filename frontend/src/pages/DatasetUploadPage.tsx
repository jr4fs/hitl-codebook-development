import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import {IconAlertCircle, IconArrowRight, IconBraces, IconFileTypeCsv, IconUpload,} from "@tabler/icons-react";
import {type ReactNode, useCallback, useState} from "react";
import {useNavigate} from "react-router-dom";
import StepTrackerBanner from "../components/StepTrackerBanner";
import GuidedTour, {GuidedTourStep} from "../components/common/GuidedTour";
import PageIntro, {usePageIntroTour} from "../components/common/PageIntro";
import {LABELS_TEMPLATE, TASK_TEMPLATE, modelOptions} from "../constants/datasetUpload.constants";
import {toast} from "../lib/toast";
import {uploadTaskBundle} from "../services/tasks.service";
import {downloadContent} from "../utils/downloadContent";
import styles from "./DatasetUploadPage.module.css";

interface UploadConfig {
  selectedModel: string | null;
  textColumn: string;
  labelColumn: string;
  coverageSampleSize: number | "";
  useRepresentativeSampling: boolean;
}

const defaultUploadConfig: UploadConfig = {
  selectedModel: "mistral:7b",
  textColumn: "translated_text",
  labelColumn: "Final Label",
  coverageSampleSize: 150,
  useRepresentativeSampling: false,
};

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
          <IconUpload size={14}/>
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
            className={`${styles.fileName} ${file ? styles.fileNameSelected : styles.fileNameMissing}`}
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
          className={`${styles.fileName} ${file ? styles.fileNameSelected : styles.fileNameMissing}`}
        >
          {file ? file.name : "No file selected"}
        </Text>
      )}
    </div>
  );
}

export default function DatasetUploadPage() {
  const navigate = useNavigate();
  const {colorScheme} = useMantineColorScheme();
  const isLight = colorScheme === "light";

  const [dValFile, setDValFile] = useState<File | null>(null);
  const [dAllFile, setDAllFile] = useState<File | null>(null);
  const [taskJsonFile, setTaskJsonFile] = useState<File | null>(null);
  const [labelsJsonFile, setLabelsJsonFile] = useState<File | null>(null);
  const [config, setConfig] = useState<UploadConfig>(defaultUploadConfig);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    introOpen,
    introMode,
    tourOpen,
    setIntroOpen,
    setTourOpen,
    openHelpIntro,
  } = usePageIntroTour("hideStep1Intro");

  const isReady = Boolean(dValFile && dAllFile && taskJsonFile && labelsJsonFile);

  const handleHelp = openHelpIntro;

  const setConfigField = useCallback(
    <K extends keyof UploadConfig>(key: K, value: UploadConfig[K]) => {
      setConfig((prev) => ({...prev, [key]: value}));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setDValFile(null);
    setDAllFile(null);
    setTaskJsonFile(null);
    setLabelsJsonFile(null);
    setConfig(defaultUploadConfig);
    setError(null);
  }, []);

  const dividerColor = isLight ? "rgba(15, 20, 24, 0.12)" : "rgba(255, 255, 255, 0.08)";

  const handleUpload = useCallback(async () => {
    if (
      !dValFile ||
      !dAllFile ||
      !taskJsonFile ||
      !labelsJsonFile ||
      !config.labelColumn ||
      !config.selectedModel
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
        textColumn: config.textColumn,
        labelColumn: config.labelColumn,
        modelName: config.selectedModel ?? "",
        coverageN:
          typeof config.coverageSampleSize === "number"
            ? config.coverageSampleSize
            : 150,
        useRepresentativeSampling: config.useRepresentativeSampling,
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
      navigate(`/codebook-creation/${response.taskId}`, {
        state: {
          task: response.task,
          fileName: response.fileName,
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to upload files.");
      } else {
        setError("Failed to upload files.");
      }
    } finally {
      setIsUploading(false);
    }
  }, [
    config,
    dAllFile,
    dValFile,
    labelsJsonFile,
    navigate,
    taskJsonFile,
  ]);

  return (
    <Box className={styles.page} style={{minHeight: "100dvh", overflowX: "hidden", overflowY: "auto"}}>
      <div className={styles.orbOne}/>
      <Container fluid className={styles.hero}>
        <Badge className={styles.kicker} variant="light" color="gray">
          New Task Setup
        </Badge>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Title className={styles.title}>Upload Your Task Files</Title>
        </Group>
        <Text className={styles.subtitle}>
          Upload your labeled examples, the remaining unlabeled data, and the task definition files to get
          started.
        </Text>
      </Container>

      <Container fluid className={styles.tableSection} style={{height: "auto", overflow: "visible"}}>
        <StepTrackerBanner currentStep={1} onHelp={handleHelp}/>

        <PageIntro
          mode={introMode}
          opened={introOpen}
          onClose={() => setIntroOpen(false)}
          title="Step 1: Upload your task files"
          description="Upload the labeled dataset, the unlabeled dataset, and the two JSON files. We will validate and move you to AI review."
          storageKey="hideStep1Intro"
          onStart={() => setTourOpen(true)}
        />

        <GuidedTour open={tourOpen} onClose={() => setTourOpen(false)}>
          <Stack gap="md">
            <Grid gutter="md" align="stretch">
              <Grid.Col span={{base: 12, md: 7}}>
                <Paper className={styles.dropCard} radius="lg" h="100%">
                  <Stack gap="sm">
                    <Title order={4} className={styles.tableTitle}>
                      Task config
                    </Title>
                    <Text size="sm" className={styles.tableMeta}>
                      Configure model and dataset columns before upload.
                    </Text>
                    <Divider my={4} color={dividerColor}/>
                    <NumberInput
                      label="Coverage sample size"
                      description="How many samples to include in the guide set. 150 by default."
                      value={config.coverageSampleSize}
                      min={1}
                      onChange={(value) =>
                        setConfigField(
                          "coverageSampleSize",
                          typeof value === "number" ? value : "",
                        )
                      }
                      classNames={{
                        label: styles.configLabel,
                        description: styles.configDescription,
                        input: styles.configInput,
                      }}
                    />
                    <Switch
                      label="Enable representative sampling"
                      description="Off by default for this pilot. When enabled, we run representative sampling before coverage."
                      checked={config.useRepresentativeSampling}
                      onChange={(event) =>
                        setConfigField(
                          "useRepresentativeSampling",
                          event.currentTarget.checked,
                        )
                      }
                      classNames={{
                        label: styles.configLabel,
                        description: styles.configDescription,
                      }}
                    />
                    <Select
                      label="Model"
                      description="Choose the model to use for AI annotation."
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
                      description="The column in your CSV that contains the text to annotate."
                      placeholder="e.g. text, translated_text, content…"
                      value={config.textColumn}
                      onChange={(event) => setConfigField("textColumn", event.currentTarget.value)}
                      classNames={{
                        label: styles.configLabel,
                        description: styles.configDescription,
                        input: styles.configInput,
                      }}
                    />
                    <TextInput
                      label="Label column name"
                      description="The column in your CSV that contains the human-annotated labels."
                      placeholder="e.g. annotations, final label, labels"
                      value={config.labelColumn}
                      onChange={(event) => setConfigField("labelColumn", event.currentTarget.value)}
                      classNames={{
                        label: styles.configLabel,
                        description: styles.configDescription,
                        input: styles.configInput,
                      }}
                    />
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{base: 12, md: 5}}>
                <Paper className={styles.dropCard} radius="lg" h="100%">
                  <Stack gap="sm">
                    <Title order={4} className={styles.tableTitle}>
                      Required files
                    </Title>
                    <Text size="sm" className={styles.tableMeta}>
                      Upload both CSVs and both JSON files to continue.
                    </Text>
                    <Divider my={4} color={dividerColor}/>
                    <GuidedTourStep
                      order={1}
                      title="Upload labeled data"
                      description='A subset of the dataset with labels. It should include "text" and "task_label" columns.'
                    >
                      <RequiredFileCard
                        inputId="labeled-dataset"
                        accept=".csv,text/csv"
                        icon={<IconFileTypeCsv size={18}/>}
                        label="Labeled dataset"
                        selectLabel="Select CSV"
                        hint="CSV with text + task_label columns"
                        file={dValFile}
                        onFileChange={setDValFile}
                      />
                    </GuidedTourStep>

                    <GuidedTourStep
                      order={2}
                      title="Upload unlabeled data"
                      description='The remaining dataset without labels. It should include a "text".'
                    >
                      <RequiredFileCard
                        inputId="unlabeled-dataset"
                        accept=".csv,text/csv"
                        icon={<IconFileTypeCsv size={18}/>}
                        label="Unlabeled dataset"
                        selectLabel="Select CSV"
                        hint="CSV with text column only"
                        file={dAllFile}
                        onFileChange={setDAllFile}
                      />
                    </GuidedTourStep>

                    <GuidedTourStep
                      order={3}
                      title="Task details"
                      description="Provide the task name and description in JSON."
                    >
                      <RequiredFileCard
                        inputId="task-json"
                        accept=".json,application/json"
                        icon={<IconBraces size={18}/>}
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
                      description="Provide the label list with name, description, keywords, and guidelines."
                    >
                      <RequiredFileCard
                        inputId="labels-json"
                        accept=".json,application/json"
                        icon={<IconBraces size={18}/>}
                        label="Label set"
                        selectLabel="Select JSON"
                        hint="JSON labels with name, keywords, guidelines"
                        file={labelsJsonFile}
                        onFileChange={setLabelsJsonFile}
                        templateAction={{
                          label: "Download template",
                          onClick: () => downloadContent("labels.json", LABELS_TEMPLATE),
                        }}
                      />
                    </GuidedTourStep>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {error && (
              <Alert icon={<IconAlertCircle size={16}/>} color="red" variant="light">
                {error}
              </Alert>
            )}


            <Group justify="space-between" mt={2}>
              <Button variant="light" className={styles.secondaryCta} onClick={handleReset}>
                Reset
              </Button>
              <div>
                <GuidedTourStep
                  order={5}
                  title="Start the upload"
                  description="When all files are selected, upload to continue."
                  position="top"
                >
                  <Button
                    className={styles.primaryCta}
                    leftSection={<IconUpload size={18}/>}
                    rightSection={<IconArrowRight size={16}/>}
                    loading={isUploading}
                    disabled={!isReady}
                    onClick={handleUpload}
                  >
                    Upload bundle
                  </Button>
                </GuidedTourStep>
              </div>
            </Group>
          </Stack>
        </GuidedTour>
      </Container>
    </Box>
  );
}
