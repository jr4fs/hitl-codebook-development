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
  IconBook2,
  IconChecklist,
  IconFileText,
  IconSparkles,
  IconUpload,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import styles from "./AnnotateDatasetLandingPage.module.css";

export default function AnnotateDatasetLandingPage() {
  const navigate = useNavigate();

  return (
    <Box className={styles.page}>
      <div className={styles.orbOne} />

      <Container fluid className={styles.hero}>
        <Badge className={styles.kicker} variant="light" color="gray">
          Annotate Dataset Flow
        </Badge>
        <Group align="flex-end" justify="space-between" wrap="wrap" mt="md">
          <Title className={styles.title}>Dataset Annotation Assistant</Title>
        </Group>
        <Text className={styles.subtitle} mt="sm">
          Apply an existing codebook to unlabeled data and export final annotations.
        </Text>
        <Group mt="lg" gap="sm">
          <Button
            size="md"
            radius="xl"
            className={styles.primaryCta}
            rightSection={<IconArrowRight size={18} />}
            onClick={() => navigate("/new-annotation")}
          >
            Start annotation task
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

      <Container fluid className={styles.flowSection}>
        <Paper className={styles.walkthroughSection}>
          <Group justify="space-between" align="center" wrap="wrap" mb="xs">
            <Title order={4} className={styles.sectionTitle}>
              Example workflow
            </Title>
            <Text className={styles.sectionHint}>
              Typical path from inputs to exported labels.
            </Text>
          </Group>

          <div className={styles.walkthroughRow}>
            <Paper className={styles.walkthroughCard}>
              <Stack gap={8}>
                <Group gap={8}>
                  <IconUpload size={18} className={styles.walkthroughIcon} />
                  <Text className={styles.walkthroughTitle}>1. Load inputs</Text>
                </Group>
                <Text className={styles.walkthroughText}>
                  Select codebook + label definitions, then add the unlabeled dataset.
                </Text>
                <div className={styles.mockPanel}>
                  <div className={styles.mockRow}>
                    <span className={styles.fileChip}>
                      <IconBook2 size={12} /> codebook_v3.json
                    </span>
                  </div>
                  <div className={styles.mockRow}>
                    <span className={styles.fileChip}>
                      <IconFileText size={12} /> labels.json
                    </span>
                  </div>
                  <div className={styles.mockRow}>
                    <span className={styles.fileChip}>
                      <IconFileText size={12} /> customer_notes_unlabeled.csv
                    </span>
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
                  <IconSparkles size={18} className={styles.walkthroughIcon} />
                  <Text className={styles.walkthroughTitle}>2. Annotate + review</Text>
                </Group>
                <Text className={styles.walkthroughText}>
                  Run annotation and review sampled rows for quality before final export.
                </Text>
                <div className={styles.mockPanel}>
                  <Text className={styles.mockPrompt}>
                    “Customer reports reduced stress after starting journaling.”
                  </Text>
                  <Group justify="space-between" gap={6} wrap="nowrap">
                    <span className={styles.predictionPill}>Predicted: Stress reduction</span>
                    <span className={styles.statusPill}>Reviewed</span>
                  </Group>
                </div>
              </Stack>
            </Paper>

            <div className={styles.walkthroughArrow}>
              <IconArrowRight size={22} />
            </div>

            <Paper className={styles.walkthroughCard}>
              <Stack gap={8}>
                <Group gap={8}>
                  <IconChecklist size={18} className={styles.walkthroughIcon} />
                  <Text className={styles.walkthroughTitle}>3. Export results</Text>
                </Group>
                <Text className={styles.walkthroughText}>
                  Download the completed annotated dataset and keep metrics for reporting.
                </Text>
                <div className={styles.mockPanel}>
                  <Group gap={6}>
                    <span className={styles.summaryChip}>4,280 rows</span>
                    <span className={styles.summaryChip}>14 labels</span>
                    <span className={styles.summaryChip}>92% reviewed</span>
                  </Group>
                  <div className={styles.exportButtonMock}>Export annotated CSV</div>
                </div>
              </Stack>
            </Paper>
          </div>

          <Text className={styles.walkthroughFootnote}>
            Use the left sidebar to reopen tasks and continue annotation later.
          </Text>
        </Paper>
      </Container>
    </Box>
  );
}
