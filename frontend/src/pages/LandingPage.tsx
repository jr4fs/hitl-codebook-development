import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowRight,
  IconBook2,
  IconHandClick,
  IconListCheck,
  IconRobot,
  IconSettings,
  IconUpload,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import styles from "./LandingPage.module.css";

const steps = [
  {
    title: "Configure anonymization",
    description:
      "Review defaults and add any rules that should apply before data enters the flow.",
    icon: IconSettings,
  },
  {
    title: "Upload CSV dataset",
    description:
      "Drop the dataset you want to annotate and preview a clean sample.",
    icon: IconUpload,
  },
  {
    title: "Define the task",
    description:
      "Name the task, set labels, and pick the columns you want to label.",
    icon: IconListCheck,
  },
  {
    title: "Manual seed annotation",
    description:
      "Label a focused set so the AI mirrors your intent and edge cases.",
    icon: IconHandClick,
  },
  {
    title: "AI annotation review",
    description: "Approve or correct suggestions with a quick review loop.",
    icon: IconRobot,
  },
  {
    title: "Codebook completion",
    description: "Lock in the final guidance and export the finished labels.",
    icon: IconBook2,
  },
];

export default function LandingPage() {
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
          Convert free-text into structured data for analysis and reporting.
        </Text>
        <Group mt="lg" gap="sm">
          <Button
            size="md"
            radius="xl"
            className={styles.primaryCta}
            rightSection={<IconArrowRight size={18} />}
            onClick={() => navigate("/upload")}
          >
            Start a new task
          </Button>
        </Group>
      </Container>

      <Container fluid id="flow" className={styles.flowSection}>
        <Group justify="space-between" align="center" wrap="wrap">
          <Title order={2} className={styles.sectionTitle}>
            The path from upload to codebook
          </Title>
          <Text className={styles.sectionHint}>
            Use the left sidebar anytime to revisit tasks.
          </Text>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" mt="lg">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Paper
                key={step.title}
                className={styles.stepCard}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <Group justify="space-between" align="center">
                  <Text className={styles.stepNumber}>{index + 1}</Text>
                  <Icon size={22} className={styles.stepIcon} />
                </Group>
                <Title order={4} className={styles.stepTitle} mt="sm">
                  {step.title}
                </Title>
                <Text className={styles.stepDescription} mt="xs">
                  {step.description}
                </Text>
                {index === 0 && (
                  <Button
                    size="xs"
                    radius="xl"
                    variant="light"
                    className={styles.stepCta}
                    rightSection={<IconArrowRight size={14} />}
                    onClick={() => navigate("/upload")}
                  >
                    Configure and upload
                  </Button>
                )}
              </Paper>
            );
          })}
        </SimpleGrid>

        <Stack className={styles.flowStrip} mt="xl" gap="xs">
          <Text className={styles.flowLabel}>Flow snapshot</Text>
          <Group gap="xs" wrap="nowrap" className={styles.flowPills}>
            {[
              "Configure anonymization",
              "Upload CSV dataset",
              "Task definition",
              "Manual seed annotation",
              "AI annotation review",
              "Codebook completion",
            ].map((label) => (
              <Box key={label} className={styles.flowPill}>
                {label}
              </Box>
            ))}
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
