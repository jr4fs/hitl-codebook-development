import { Badge, Box, Button, Container, Group, Paper, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconFileCheck } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import styles from "./AnnotateDatasetLandingPage.module.css";

export default function AnnotateDatasetLandingPage() {
  const navigate = useNavigate();

  return (
    <Box className={styles.page}>
      <div className={styles.orbOne} />
      <Container fluid className={styles.hero}>
        <Badge className={styles.kicker} variant="light" color="gray">
          Annotate Dataset
        </Badge>
        <Title className={styles.title}>Dataset Annotation Task</Title>
        <Text className={styles.subtitle} mt="sm">
          This landing page is reserved for the annotate-dataset workflow and is intentionally empty for now.
        </Text>
      </Container>

      <Container fluid className={styles.contentSection}>
        <Paper className={styles.card}>
          <Group gap="xs" mb="sm">
            <IconFileCheck size={20} className={styles.icon} />
            <Text className={styles.cardTitle}>Requirements</Text>
          </Group>
          <Text className={styles.cardText}>1. Codebook file</Text>
          <Text className={styles.cardText}>2. Unlabeled dataset to annotate</Text>
          <Text className={styles.cardText}>3. Label definition file</Text>

          <Button
            mt="lg"
            radius="xl"
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate("/")}
          >
            Back to workflow selection
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
