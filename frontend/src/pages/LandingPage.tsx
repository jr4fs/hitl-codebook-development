import { useState } from "react";
import { Box, Button, Group, Paper, Stack, Text, Title, Badge, Collapse, Center } from "@mantine/core";
import {
  IconArrowRight,
  IconUpload,
  IconRobot,
  IconFileText,
  IconChecklist,
  IconBook2,
  IconChevronDown,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useDemo } from "../demo/DemoContext";
import { PilotBanner } from "../components/PilotBanner";
import styles from "./LandingPage.module.css";

const isPilot = import.meta.env.VITE_APP_MODE === "pilot";

type TabType = "description" | "example" | "demo";
type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDemo } = useDemo();
  const [activeTab, setActiveTab] = useState<TabType>("description");
  const [activeStep, setActiveStep] = useState<StepNumber>(1);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  const steps: Array<{ number: StepNumber; title: string }> = [
    { number: 1, title: "The task" },
    { number: 2, title: "LLM reads a post" },
    { number: 3, title: "You validate" },
    { number: 4, title: "Batch done → rules" },
    { number: 5, title: "Next batch, smarter" },
    { number: 6, title: "Done — export" },
  ];

  const renderExamplePanel = () => {
    switch (activeStep) {
      case 1:
        return (
          <Stack gap="md">
            <Box>
              <Text className={styles.panelLabel}>Labels</Text>
              <Stack gap={8} mt={8}>
                <Box className={styles.labelCard}>
                  <Text className={styles.labelName}>crisis_intervention</Text>
                  <Text className={styles.labelDef}>
                    Acute crisis requiring immediate response — psychiatric symptoms, safety concerns, paranoia
                  </Text>
                </Box>
                <Box className={styles.labelCard}>
                  <Text className={styles.labelName}>service_coordination</Text>
                  <Text className={styles.labelDef}>
                    Coordinating with external agencies — legal, medical, housing, or community resources
                  </Text>
                </Box>
                <Box className={styles.labelCard}>
                  <Text className={styles.labelName}>routine_support</Text>
                  <Text className={styles.labelDef}>
                    Regular check-in or ongoing case management — emotional support, basic needs, follow-up
                  </Text>
                </Box>
              </Stack>
            </Box>

            <Box className={styles.divider} />

            <Box>
              <Text className={styles.panelLabel}>Upload files</Text>
              <Stack gap={8} mt={8}>
                {[
                  {
                    name: "Labeled",
                    file: "labeled.csv",
                    desc: "Pre-labeled dataset for validation. Should contain your raw text data and ground-truth labels. Used to evaluate LLM performance and calibrate feedback.",
                    sample: "id,text_data,label\n1,\"YP presented with psychosis...\",crisis_intervention\n2,\"HCM reached out to Public Defender...\",service_coordination\n3,\"YP called feeling overwhelmed...\",routine_support"
                  },
                  {
                    name: "Unlabeled",
                    file: "unlabeled.csv",
                    desc: "Large pool of unlabeled data. The system will select 150 representative samples from this for annotation. Should be diverse and representative of your full dataset.",
                    sample: "id,text_data\n1,\"YP arrived presenting in low mood...\"\n2,\"HCM coordinated with housing provider...\"\n3,\"YP called requesting emotional support...\"\n4,\"TCM engaged YP in risk assessment...\""
                  },
                  {
                    name: "Task_Details",
                    file: "task.json",
                    desc: "JSON file describing the annotation task. Includes task name, description, and special instructions.",
                    sample: `{
  "name": "Youth_Case_Note_Classification",
  "description": "Classify the primary type of support interaction in youth homelessness case notes",
  "text_column": "text_data",
  "label_column": "label"
}`
                  },
                  {
                    name: "Labels",
                    file: "labels.json",
                    desc: "JSON file defining all available labels with descriptions and keywords for LLM understanding.",
                    sample: `[
  {
    "name": "crisis_intervention",
    "description": "Acute crisis requiring immediate response",
    "keywords": ["crisis", "paranoia", "psychosis", "safety"]
  },
  {
    "name": "service_coordination",
    "description": "Coordinating with external agencies or resources",
    "keywords": ["referral", "court", "appointment", "outreach"]
  }
]`
                  },
                ].map((file) => (
                  <Box key={file.name}>
                    <button
                      className={styles.fileExpandButton}
                      onClick={() => setExpandedFile(expandedFile === file.name ? null : file.name)}
                    >
                      <Group justify="space-between" style={{ width: "100%" }}>
                        <Group gap={8}>
                          <IconFileText size={12} />
                          <span>{file.file}</span>
                          <Text className={styles.fileLabel}>{file.name}</Text>
                        </Group>
                        <IconChevronDown size={14} style={{ transform: expandedFile === file.name ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }} />
                      </Group>
                    </button>
                    <Collapse in={expandedFile === file.name}>
                      <Stack gap={8}>
                        <Text className={styles.fileDescription}>{file.desc}</Text>
                        <Box className={styles.sampleDataBox}>
                          <Text className={styles.sampleDataLabel}>Sample:</Text>
                          <pre className={styles.sampleDataPre}>{file.sample}</pre>
                        </Box>
                      </Stack>
                    </Collapse>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box>
              <Text className={styles.panelLabel}>Sampling strategy</Text>
              <Text className={styles.sampleBadgeText}>
                ✓ 150 samples selected via semantic + representative sampling
              </Text>
            </Box>
          </Stack>
        );

      case 2:
        return (
          <Stack gap="md">
            <Box className={styles.sampleBox}>
              <Text className={styles.panelLabel}>Sample case note</Text>
              <Text className={styles.sampleText}>
                "HCM [PERSON] was alerted by staff that YP was presenting with high energy and making comments about machetes. YP was speaking in a flight of ideas about being hurt by others and HCM engaged in a risk assessment."
              </Text>
            </Box>

            <Box className={styles.divider} />

            <Box>
              <Text className={styles.panelLabel}>LLM prediction</Text>
              <Stack gap={8} mt={8}>
                <Box className={styles.predictionRow}>
                  <span className={styles.predictionLabel}>Label</span>
                  <span className={styles.predictionValue}>crisis_intervention</span>
                </Box>
                <Box className={styles.predictionRow}>
                  <span className={styles.predictionLabel}>Span text</span>
                  <span className={styles.predictionValue}>flight of ideas about being hurt by others... risk assessment</span>
                </Box>
                <Box className={styles.predictionRow}>
                  <span className={styles.predictionLabel}>Reasoning</span>
                  <span className={styles.predictionValue}>
                    YP presents with acute psychiatric symptoms — paranoid ideation and flight of ideas requiring immediate response.
                  </span>
                </Box>
              </Stack>
            </Box>
          </Stack>
        );

      case 3:
        return (
          <Stack gap="md">
            <Box>
              <Text className={styles.panelLabel}>Progress</Text>
              <Text className={styles.progressText}>Batch 1 · Sample 3 of 5</Text>
            </Box>

            <Box className={styles.sampleBox}>
              <Text className={styles.panelLabel}>Sample case note</Text>
              <Text className={styles.sampleText}>
                "YP called and identified feeling overwhelmed. YP reported food insecurity and that a recent bike injury had prevented him from working. DOP agreed to drop off additional grocery store cards to support."
              </Text>
            </Box>

            <Box className={styles.divider} />

            <Box>
              <Text className={styles.panelLabel}>Validate AI prediction</Text>
              <Stack gap={8} mt={8}>
                <Box className={styles.validationRowIncorrect}>
                  <Box>
                    <Text className={styles.validationLabel}>Label</Text>
                    <Text className={styles.validationText}>service_coordination</Text>
                  </Box>
                  <span className={styles.xmark}>✗</span>
                </Box>
                <Box>
                  <Text className={styles.feedbackLabel}>You marked as incorrect</Text>
                  <textarea className={styles.feedbackInput} placeholder="Explain why this prediction was wrong..." defaultValue="YP is reaching out for emotional support and basic needs — no external agency involved. Should be 'routine_support'." />
                </Box>
                <Box className={styles.validationRowCorrect}>
                  <Box>
                    <Text className={styles.validationLabel}>Correct label</Text>
                    <Text className={styles.validationText}>routine_support</Text>
                  </Box>
                  <span className={styles.checkmark}>✓</span>
                </Box>
              </Stack>
            </Box>
          </Stack>
        );

      case 4:
        return (
          <Stack gap="md">
            <Box className={styles.batchCompleteBox}>
              <Text className={styles.batchCompleteText}>Batch 1 complete · 5 samples reviewed</Text>
            </Box>

            <Box className={styles.divider} />

            <Box>
              <Text className={styles.panelLabel}>Rules synthesized</Text>
              <Stack gap={8} mt={8}>
                <Box className={styles.ruleCard}>
                  <Group justify="space-between" align="flex-start" gap="sm">
                    <Text className={styles.ruleText}>
                      Notes describing flight of ideas, paranoid ideation, or unresponsiveness → crisis_intervention
                    </Text>
                    <Badge size="sm" variant="light" color="green">
                      new
                    </Badge>
                  </Group>
                </Box>
                <Box className={styles.ruleCard}>
                  <Group justify="space-between" align="flex-start" gap="sm">
                    <Text className={styles.ruleText}>
                      Notes involving inter-agency emails, court coordination, or external referrals → service_coordination
                    </Text>
                    <Badge size="sm" variant="light" color="green">
                      new
                    </Badge>
                  </Group>
                </Box>
              </Stack>
              <Text className={styles.ruleCountText}>2 new rules added</Text>
            </Box>

            <Box>
              <Text className={styles.accuracyBadgeLabel}>Batch accuracy</Text>
              <Text className={styles.accuracyValue}>80%</Text>
            </Box>
          </Stack>
        );

      case 5:
        return (
          <Stack gap="md">
            <Box>
              <Text className={styles.panelLabel}>Progress</Text>
              <Text className={styles.progressText}>Batch 2 · Sample 7 of 10</Text>
            </Box>

            <Box className={styles.sampleBox}>
              <Text className={styles.panelLabel}>Sample case note</Text>
              <Text className={styles.sampleText}>
                "HCM [PERSON] reached out to Public Defender [PERSON] Choi (PDSC) for a check-in phone call regarding the status of YP options before appearing in ODR Court. HCM coordinated housing and mental health support options."
              </Text>
            </Box>

            <Box className={styles.divider} />

            <Box>
              <Text className={styles.panelLabel}>LLM prediction (using rules)</Text>
              <Stack gap={8} mt={8}>
                <Box className={styles.predictionRow}>
                  <span className={styles.predictionLabel}>Label</span>
                  <span className={styles.predictionValue}>service_coordination</span>
                </Box>
                <Box className={styles.predictionRow}>
                  <span className={styles.predictionLabel}>Span text</span>
                  <span className={styles.predictionValue}>reached out to Public Defender... ODR Court</span>
                </Box>
              </Stack>
            </Box>

            <Box>
              <Text className={styles.accuracyBadgeLabel}>Batch accuracy</Text>
              <Text className={styles.accuracyValue}>94%</Text>
            </Box>

            <Box>
              <Text className={styles.panelLabel}>Codebook now has</Text>
              <Text className={styles.codebookStats}>6 rules</Text>
            </Box>
          </Stack>
        );

      case 6:
        return (
          <Stack gap="md">
            <Box className={styles.completeBox}>
              <Text className={styles.completeText}>✓ All 150 samples reviewed</Text>
            </Box>

            <Box className={styles.divider} />

            <Box>
              <Text className={styles.panelLabel}>Final metrics</Text>
              <Group grow gap={8} mt={8}>
                <Box className={styles.metricCard}>
                  <Text className={styles.metricLabel}>Precision</Text>
                  <Text className={styles.metricValue}>0.91</Text>
                </Box>
                <Box className={styles.metricCard}>
                  <Text className={styles.metricLabel}>Recall</Text>
                  <Text className={styles.metricValue}>0.89</Text>
                </Box>
                <Box className={styles.metricCard}>
                  <Text className={styles.metricLabel}>F1</Text>
                  <Text className={styles.metricValue}>0.90</Text>
                </Box>
              </Group>
            </Box>

            <Box>
              <Text className={styles.panelLabel}>Codebook</Text>
              <Group gap={6} mt={8}>
                <span className={styles.summaryChip}>12 rules</span>
                <span className={styles.summaryChip}>3 labels</span>
                <span className={styles.summaryChip}>case notes</span>
              </Group>
            </Box>

            <Button
              fullWidth
              size="md"
              radius="xl"
              className={styles.exportButton}
              leftSection={<IconChecklist size={16} />}
            >
              Export case_notes_codebook.json
            </Button>

            <Box className={styles.divider} />

            <Box>
              <Text className={styles.panelLabel}>Your exported codebook</Text>
              <Box className={styles.sampleDataBox}>
                <pre className={styles.sampleDataPre}>{`{
  "name": "Youth_Case_Note_Classification_v1",
  "description": "Classify primary support interaction in youth homelessness case notes",
  "labels": ["crisis_intervention", "service_coordination", "routine_support"],
  "rules": [
    "Notes with flight of ideas, paranoid ideation, or unresponsiveness → crisis_intervention",
    "Notes documenting a risk assessment or acute safety concern → crisis_intervention",
    "Notes involving inter-agency emails, court coordination, or referrals → service_coordination",
    "Notes about medical appointments or housing provider outreach → service_coordination",
    "Notes describing a routine check-in or basic needs support → routine_support",
    "Notes where YP calls or arrives without crisis indicators → routine_support"
  ],
  "metadata": {
    "samples_reviewed": 150,
    "final_accuracy": 0.91,
    "created_at": "2025-05-13",
    "version": "1.0"
  }
}`}</pre>
              </Box>
              <Text className={styles.codebookHint}>
                Use this codebook in future annotation tasks to guide your LLM with learned rules and patterns.
              </Text>
            </Box>
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <>
    {isPilot && !isDemo && <PilotBanner />}
    <Box className={styles.page}>
      <div className={styles.orbOne} />

      {/* Sticky Navbar */}
      <Box className={styles.navbar}>
        <div className={styles.navbarContent}>
          <Group gap="lg" justify="space-between" align="center">
            {/* Logo */}
            <Group gap={8}>
              <img src="/annotate-icon.svg" alt="Annotation Assistant" className={styles.navbarLogo} />
              <Text className={styles.logoText}>Annotation Assistant</Text>
            </Group>

            {/* Tabs */}
            <Group gap={12}>
              {["description", "example", "demo"].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tabButton} ${activeTab === tab ? styles.tabButtonActive : ""}`}
                  onClick={() => {
                    if (tab === "demo") {
                      isDemo ? navigate("/home") : (window.location.href = "/demo");
                    } else {
                      setActiveTab(tab as TabType);
                    }
                  }}
                >
                  <span style={{ textTransform: "capitalize" }}>
                    {tab}
                    {tab === "demo" && <IconArrowRight size={14} style={{ marginLeft: 4 }} />}
                  </span>
                </button>
              ))}
            </Group>

            {/* Login Button */}
            {!isDemo && (
              <Button
                size="md"
                radius="xl"
                className={styles.loginButton}
                rightSection={<IconArrowRight size={16} />}
                onClick={() => navigate("/login")}
              >
                Log in
              </Button>
            )}
          </Group>
        </div>
      </Box>

      {/* Content Area */}
      <Box className={styles.content}>
        {activeTab === "description" && (
          <Box className={styles.section}>
            <Center mb={32}>
              <img src="/annotate-icon.svg" alt="Annotation Assistant" className={styles.logoIcon} />
            </Center>
            <Box className={styles.hero}>
              <Title className={styles.heroTitle}>Train your LLM like a human annotator.</Title>
              <Text className={styles.heroSubtitle}>
                Most annotation tools scale the work — Annotation Assistant scales the judgment. Build a living
                playbook that teaches your LLM exactly how to label, batch by batch.
              </Text>
            </Box>

            <Box className={styles.conceptCardsContainer}>
              <Paper className={styles.conceptCard}>
                <Group gap={10} mb="sm">
                  <IconUpload size={20} className={styles.conceptIcon} />
                  <Text className={styles.conceptTitle}>Upload your data</Text>
                </Group>
                <Text className={styles.conceptText}>
                  Labeled validation set + unlabeled pool, task config, label definitions. Start with any dataset.
                </Text>
              </Paper>

              <Paper className={styles.conceptCard}>
                <Group gap={10} mb="sm">
                  <IconRobot size={20} className={styles.conceptIcon} />
                  <Text className={styles.conceptTitle}>Co-annotate with LLM</Text>
                </Group>
                <Text className={styles.conceptText}>
                  Review AI predictions, give feedback, rules synthesize automatically after every 5 samples.
                </Text>
              </Paper>

              <Paper className={styles.conceptCard}>
                <Group gap={10} mb="sm">
                  <IconBook2 size={20} className={styles.conceptIcon} />
                  <Text className={styles.conceptTitle}>Export a production codebook</Text>
                </Group>
                <Text className={styles.conceptText}>
                  A validated, rule-backed codebook ready to power large-scale annotation pipelines.
                </Text>
              </Paper>
            </Box>

            <Box className={styles.descriptionFooter}>
              <Button
                size="md"
                radius="xl"
                className={styles.exampleCta}
                rightSection={<IconArrowRight size={18} />}
                onClick={() => setActiveTab("example")}
              >
                See a step-by-step example
              </Button>
            </Box>
          </Box>
        )}

        {activeTab === "example" && (
          <Box className={styles.exampleSection}>
            {/* Step List (Sidebar) */}
            <Box className={styles.stepListContainer}>
              <Stack gap={0}>
                {steps.map((step) => (
                  <button
                    key={step.number}
                    className={`${styles.stepButton} ${activeStep === step.number ? styles.stepButtonActive : ""}`}
                    onClick={() => setActiveStep(step.number)}
                  >
                    <span className={styles.stepNumber}>{step.number}</span>
                    <span className={styles.stepTitle}>{step.title}</span>
                  </button>
                ))}
              </Stack>
            </Box>

            {/* Panel */}
            <Box className={styles.examplePanel}>
              {renderExamplePanel()}
            </Box>
          </Box>
        )}

        {activeTab === "demo" && (
          <Box className={styles.section}>
            <Box style={{ textAlign: "center", paddingTop: 40 }}>
              <Text className={styles.comingSoonText}>Demo coming soon</Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
    </>
  );
}
