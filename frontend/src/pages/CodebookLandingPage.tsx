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
        <Group align="flex-end" justify="space-between" wrap="wrap" mt="md">
          <Title className={styles.title}>Annotation Assistant</Title>
        </Group>
        <Text className={styles.subtitle} mt="sm">
          Build and refine a codebook from labeled and unlabeled datasets.
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
          <Button
            size="md"
            radius="xl"
            variant="light"
            className={styles.secondaryCta}
            onClick={() => navigate("/")}
          >
            Back to workflow selection
          </Button>
        </Group>
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
                  <Text className={styles.mockPrompt}>
                    “Client reports improved sleep after two weeks.”
                  </Text>
                  <Group justify="space-between" gap={6} wrap="nowrap">
                    <span className={styles.predictionPill}>Predicted: Sleep improvement</span>
                    <span className={styles.statusPill}>Marked: Correct</span>
                  </Group>
                  <Text className={styles.exampleLabel}>
                    Rule added: If note mentions improved sleep -&gt; Sleep improvement
                  </Text>
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
          <Text className={styles.walkthroughFootnote}>
            Existing tasks remain accessible from the left sidebar.
          </Text>
        </Paper>
      </Container>
    </Box>
  );
}
