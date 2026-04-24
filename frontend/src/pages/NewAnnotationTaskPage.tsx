import { Paper, Stack, Text, Title } from "@mantine/core";

export default function NewAnnotationTaskPage() {
  return (
    <Paper p="xl" mih="100vh" bg="var(--mantine-color-body)">
      <Stack gap="sm">
        <Title order={2}>New Annotation Task</Title>
        <Text c="dimmed">Page scaffolded. Implementation pending.</Text>
      </Stack>
    </Paper>
  );
}
