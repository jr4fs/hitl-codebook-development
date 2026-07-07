import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowRight,
  IconBraces,
  IconBook2,
  IconChecklist,
  IconFileText,
  IconRobot,
  IconUpload,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import styles from "./CodebookLandingPage.module.css";

export default function CodebookLandingPage() {
  const navigate = useNavigate();

  return (
    <Box className={styles.page}>
      <div className={styles.orbOne} />

      <Container fluid className={styles.hero}>
        <Badge className={styles.kicker} variant="light" color="gray">
          Guided Annotation Flow
        </Badge>
        <div className={styles.heroGrid}>
          <Paper className={styles.heroCard}>
            <Title className={styles.title}>Human in the loop codebook development</Title>
            <Text className={styles.subtitle} mt="sm">
              To get started, create a task, define your labels, and work with
              language models to develop a codebook.
            </Text>
            <Group mt="lg" gap="sm">
              <Button
                size="md"
                radius="xl"
                className={styles.primaryCta}
                rightSection={<IconArrowRight size={18} />}
                onClick={() => navigate("/new-codebook")}
              >
                Start a new task
              </Button>
            </Group>
          </Paper>
        </div>
      </Container>

      <Container fluid id="flow" className={styles.flowSection}>
        <Paper className={styles.walkthroughSection} mt="md">
          <Group justify="space-between" align="center" wrap="wrap" mb="xs">
            <Title order={4} className={styles.sectionTitle}>
              Example workflow
            </Title>
            <Text className={styles.sectionHint}>
              A realistic path from files to final codebook.
            </Text>
          </Group>
          <div className={styles.walkthroughRow}>
            <Paper className={styles.walkthroughCard}>
              <Stack gap={8}>
                <Group gap={8}>
                  <IconUpload size={18} className={styles.walkthroughIcon} />
                  <Text className={styles.walkthroughTitle}>1. Upload task bundle</Text>
                </Group>
                <Text className={styles.walkthroughText}>
                  Upload `labeled_examples.csv`, `remaining_notes.csv`, `task.json`, and `labels.json`.
                </Text>
                <div className={styles.mockPanel}>
                  <div className={styles.mockRow}>
                    <span className={styles.fileChip}><IconFileText size={12} /> labeled_examples.csv</span>
                  </div>
                  <div className={styles.mockRow}>
                    <span className={styles.fileChip}><IconFileText size={12} /> remaining_notes.csv</span>
                  </div>
                  <div className={styles.mockRow}>
                    <span className={styles.fileChip}><IconBraces size={12} /> task.json</span>
                    <span className={styles.fileChip}><IconBraces size={12} /> labels.json</span>
                  </div>
                </div>
              </Stack>
            </Paper>

            <div className={styles.walkthroughArrow}>
              <IconArrowRight size={22} />
            </div>

            <Paper className={styles.walkthroughCard}>
              <Stack gap={8}>
                <Group gap={8}>
                  <IconRobot size={18} className={styles.walkthroughIcon} />
                  <Text className={styles.walkthroughTitle}>2. Review and refine</Text>
                </Group>
                <Text className={styles.walkthroughText}>
                  Check AI predictions, mark correctness, and update rules in the codebook panel.
                </Text>
                <div className={styles.mockPanel}>
                  <div className={styles.sampleCard}>
                    <Text className={styles.sampleCardLabel}>Sample post</Text>
                    <Text className={styles.mockPrompt}>
                      "Ad on Facebook Marketplace showing one belt made with pangolin leather. On sale."
                    </Text>
                  </div>
                  <Group justify="space-between" gap={6} wrap="nowrap">
                    <span className={styles.predictionPill}>Predicted: negative</span>
                    <span className={styles.statusPill}>Marked: Correct</span>
                  </Group>
                  <div className={styles.ruleCard}>
                    <Text className={styles.sampleCardLabel}>Rule added</Text>
                    <Text className={styles.exampleLabel}>
                      If a post promotes pangolin products or sales, label it as negative toward conservation.
                    </Text>
                  </div>
                </div>
              </Stack>
            </Paper>

            <div className={styles.walkthroughArrow}>
              <IconArrowRight size={22} />
            </div>

            <Paper className={styles.walkthroughCard}>
              <Stack gap={8}>
                <Group gap={8}>
                  <IconBook2 size={18} className={styles.walkthroughIcon} />
                  <Text className={styles.walkthroughTitle}>3. Export final codebook</Text>
                </Group>
                <Text className={styles.walkthroughText}>
                  Export the updated rules and labels for downstream dataset annotation tasks.
                </Text>
                <div className={styles.mockPanel}>
                  <Group gap={8}>
                    <IconChecklist size={15} className={styles.exampleIcon} />
                    <Text className={styles.exampleLabel}>codebook_v3.json ready</Text>
                  </Group>
                  <Group gap={6}>
                    <span className={styles.summaryChip}>14 labels</span>
                    <span className={styles.summaryChip}>36 rules</span>
                    <span className={styles.summaryChip}>updated today</span>
                  </Group>
                  <div className={styles.exportButtonMock}>Export Codebook</div>
                </div>
              </Stack>
            </Paper>
          </div>
        </Paper>
      </Container>
    </Box>
  );
}
