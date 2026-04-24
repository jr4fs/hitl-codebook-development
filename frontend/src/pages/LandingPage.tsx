import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowRight,
  IconChecklist,
  IconFileText,
  IconFolderOpen,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import styles from "./LandingPage.module.css";

const options = [
  {
    title: "Create Codebook",
    description:
      "Start a new task to build a codebook from labeled and unlabeled data with task and label definitions.",
    requirements: [
      "Labeled subset file",
      "Unlabeled dataset file",
      "Task definition file",
      "Label definitions file",
    ],
    icon: IconFolderOpen,
    cta: "Go to codebook task",
    path: "/codebook-landing",
  },
  {
    title: "Annotate Dataset",
    description:
      "Use an existing codebook to label a fresh unlabeled dataset in a dedicated annotation workflow.",
    requirements: [
      "Codebook file",
      "Unlabeled dataset to annotate",
      "Task definition file",
      "Label definitions file",
    ],
    icon: IconFileText,
    cta: "Go to annotation task",
    path: "/annotate-dataset-landing",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box className={styles.page}>
      <div className={styles.orbOne} />
      <Container fluid className={styles.hero}>
        <Badge className={styles.kicker} variant="light" color="gray">
          Choose Workflow
        </Badge>
        <Title className={styles.title}>Annotation Assistant</Title>
        <Text className={styles.subtitle} mt="sm">
          Select how you want to start your work.
        </Text>
      </Container>

      <Container fluid className={styles.optionsSection}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {options.map((option) => {
            const Icon = option.icon;

            return (
              <Paper key={option.title} className={styles.optionCard}>
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <Icon size={20} className={styles.optionIcon} />
                      <Title order={3} className={styles.optionTitle}>
                        {option.title}
                      </Title>
                    </Group>
                  </Group>

                  <Button
                    size="md"
                    radius="xl"
                    className={styles.primaryCta}
                    rightSection={<IconArrowRight size={18} />}
                    onClick={() => navigate(option.path)}
                  >
                    {option.cta}
                  </Button>

                  <Text className={styles.description}>{option.description}</Text>

                  <Stack gap={6}>
                    <Group gap={6}>
                      <IconChecklist size={16} className={styles.requirementIcon} />
                      <Text className={styles.requirementsTitle}>Requirements</Text>
                    </Group>
                    <List spacing={4} className={styles.requirementsList}>
                      {option.requirements.map((requirement) => (
                        <List.Item key={requirement}>{requirement}</List.Item>
                      ))}
                    </List>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
