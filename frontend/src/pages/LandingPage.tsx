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
  IconRobot,
  IconUpload,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import styles from "./LandingPage.module.css";

const steps = [
  {
    title: "Upload task bundle",
    description:
      "Upload a subset of the data (labeled), the remaining unlabeled data, and the task and labels definition files to start in one step.",
    icon: IconUpload,
  },
  {
    title: "AI annotation review",
    description: "Approve or correct suggestions with a focused review loop.",
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
                    Upload bundle
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
              "Upload task bundle",
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
