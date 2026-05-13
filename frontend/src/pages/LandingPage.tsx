import { useState } from "react";
import { Box, Button, Group, Paper, Stack, Text, Title, Tooltip, Badge, Collapse, Center } from "@mantine/core";
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
import styles from "./LandingPage.module.css";

type TabType = "description" | "example" | "demo";
type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

export default function LandingPage() {
  const navigate = useNavigate();
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
                  <Text className={styles.labelName}>positive</Text>
                  <Text className={styles.labelDef}>
                    Supports protecting pangolins — anti-trade, rescue stories, conservation fundraising
                  </Text>
                </Box>
                <Box className={styles.labelCard}>
                  <Text className={styles.labelName}>negative</Text>
                  <Text className={styles.labelDef}>
                    Promotes consumption, sale, or use — bushmeat, TCM, pets, pangolin products
                  </Text>
                </Box>
                <Box className={styles.labelCard}>
                  <Text className={styles.labelName}>neutral</Text>
                  <Text className={styles.labelDef}>
                    Mentions pangolins without clear stance — memes, cartoons, art, brand names
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
                    sample: "recordID,text,label\n1,\"Post about pangolin protection\",positive\n2,\"Selling pangolin leather products\",negative\n3,\"Meme mentioning pangolins\",neutral"
                  },
                  {
                    name: "Unlabeled",
                    file: "unlabeled.csv",
                    desc: "Large pool of unlabeled data. The system will select 150 representative samples from this for annotation. Should be diverse and representative of your full dataset.",
                    sample: "recordID,text\n1,\"New research on ecosystem role\"\n2,\"Animal trafficking news story\"\n3,\"Conservation fundraising campaign\"\n4,\"Wildlife documentary clip\""
                  },
                  {
                    name: "Task_Details",
                    file: "task.json",
                    desc: "JSON file describing the annotation task. Includes task name, description, and special instructions.",
                    sample: `{
  "name": "Pangolin_Classification",
  "description": "Label sentiment toward pangolin conservation",
  "text_column": "text",
  "label_column": "label",
  "instructions": "Classify posts as positive, negative, or neutral based on conservation stance"
}`
                  },
                  {
                    name: "Labels",
                    file: "labels.json",
                    desc: "JSON file defining all available labels with descriptions and keywords for LLM understanding.",
                    sample: `[
  {
    "name": "positive",
    "description": "Supports protecting pangolins",
    "keywords": ["conservation", "protection", "endangered"]
  },
  {
    "name": "negative",
    "description": "Promotes consumption or sale",
    "keywords": ["trade", "bushmeat", "products"]
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
              <Text className={styles.panelLabel}>Sample post</Text>
              <Text className={styles.sampleText}>
                "Ad on Facebook Marketplace showing one belt made with pangolin leather. On sale."
              </Text>
            </Box>

            <Box className={styles.divider} />

            <Box>
              <Text className={styles.panelLabel}>LLM prediction</Text>
              <Stack gap={8} mt={8}>
                <Box className={styles.predictionRow}>
                  <span className={styles.predictionLabel}>Label</span>
                  <span className={styles.predictionValue}>negative</span>
                </Box>
                <Box className={styles.predictionRow}>
                  <span className={styles.predictionLabel}>Span text</span>
                  <span className={styles.predictionValue}>belt made with pangolin leather. On sale</span>
                </Box>
                <Box className={styles.predictionRow}>
                  <span className={styles.predictionLabel}>Reasoning</span>
                  <span className={styles.predictionValue}>
                    Post is promoting the commercial sale of a pangolin product.
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
              <Text className={styles.panelLabel}>Sample post</Text>
              <Text className={styles.sampleText}>
                "New research shows pangolins are important for ecosystem health. Scientists urge protection of these animals."
              </Text>
            </Box>

            <Box className={styles.divider} />

            <Box>
              <Text className={styles.panelLabel}>Validate AI prediction</Text>
              <Stack gap={8} mt={8}>
                <Box className={styles.validationRowIncorrect}>
                  <Box>
                    <Text className={styles.validationLabel}>Label</Text>
                    <Text className={styles.validationText}>neutral</Text>
                  </Box>
                  <span className={styles.xmark}>✗</span>
                </Box>
                <Box>
                  <Text className={styles.feedbackLabel}>You marked as incorrect</Text>
                  <textarea className={styles.feedbackInput} placeholder="Explain why this prediction was wrong..." defaultValue="This is clearly positive — talks about importance and urges protection. Should be 'positive'." />
                </Box>
                <Box className={styles.validationRowCorrect}>
                  <Box>
                    <Text className={styles.validationLabel}>Correct label</Text>
                    <Text className={styles.validationText}>positive</Text>
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
                      Posts promoting pangolin products for sale or consumption → negative
                    </Text>
                    <Badge size="sm" variant="light" color="green">
                      new
                    </Badge>
                  </Group>
                </Box>
                <Box className={styles.ruleCard}>
                  <Group justify="space-between" align="flex-start" gap="sm">
                    <Text className={styles.ruleText}>
                      Posts referencing pangolin leather, ivory, or bushmeat use → negative
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
              <Text className={styles.panelLabel}>Sample post</Text>
              <Text className={styles.sampleText}>
                "WWF announced a record $2M grant for pangolin protection in Southeast Asia."
              </Text>
            </Box>

            <Box className={styles.divider} />

            <Box>
              <Text className={styles.panelLabel}>LLM prediction (using rules)</Text>
              <Stack gap={8} mt={8}>
                <Box className={styles.predictionRow}>
                  <span className={styles.predictionLabel}>Label</span>
                  <span className={styles.predictionValue}>positive</span>
                </Box>
                <Box className={styles.predictionRow}>
                  <span className={styles.predictionLabel}>Span text</span>
                  <span className={styles.predictionValue}>record $2M grant for pangolin protection</span>
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
              </Group>
            </Box>

            <Button
              fullWidth
              size="md"
              radius="xl"
              className={styles.exportButton}
              leftSection={<IconChecklist size={16} />}
            >
              Export codebook_final.json
            </Button>

            <Box className={styles.divider} />

            <Box>
              <Text className={styles.panelLabel}>Your exported codebook</Text>
              <Box className={styles.sampleDataBox}>
                <pre className={styles.sampleDataPre}>{`{
  "name": "Pangolin_Classification_v1",
  "description": "Label sentiment toward pangolin conservation",
  "labels": ["positive", "negative", "neutral"],
  "rules": [
    "Posts about conservation fundraising or protection → positive",
    "Posts mentioning endangered species protection → positive",
    "Posts promoting pangolin products for sale → negative",
    "Posts about pangolin leather, ivory, or bushmeat → negative",
    "References to pangolin trade or poaching → negative",
    "Memes or entertainment mentioning pangolins → neutral",
    "Scientific facts without conservation stance → neutral",
    "Brand names or unrelated mentions → neutral"
  ],
  "metadata": {
    "samples_reviewed": 150,
    "final_accuracy": 0.90,
    "created_at": "2024-05-13",
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
                  onClick={() => tab !== "demo" && setActiveTab(tab as TabType)}
                  disabled={tab === "demo"}
                >
                  {tab === "demo" ? (
                    <Tooltip label="Coming soon" position="bottom" withArrow>
                      <span>
                        Demo <IconArrowRight size={14} style={{ marginLeft: 4 }} />
                      </span>
                    </Tooltip>
                  ) : (
                    <span style={{ textTransform: "capitalize" }}>{tab}</span>
                  )}
                </button>
              ))}
            </Group>

            {/* Login Button */}
            <Button
              size="md"
              radius="xl"
              className={styles.loginButton}
              rightSection={<IconArrowRight size={16} />}
              onClick={() => navigate("/login")}
            >
              Log in
            </Button>
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
  );
}
