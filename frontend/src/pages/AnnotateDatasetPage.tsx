import { Paper, Stack, Text, Title } from "@mantine/core";
import { useParams } from "react-router-dom";

export default function AnnotateDatasetPage() {
  const { id } = useParams();

  return (
    <Paper p="xl" mih="100vh" bg="var(--mantine-color-body)">
      <Stack gap="sm">
        <Title order={2}>Annotate Dataset</Title>
        <Text c="dimmed">
          Page scaffolded for dataset id: {id ?? "unknown"}.
        </Text>
      </Stack>
    </Paper>
  );
}
