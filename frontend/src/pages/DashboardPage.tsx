import {
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Task } from "@common/types/tasks";
import { toast } from "../lib/toast";
import {
  downloadMetricsFile,
  getValEvalProgress,
  runValEvaluation,
} from "../services/metrics.service";
import { getTaskById } from "../services/tasks.service";

export default function DashboardPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [predictionsFilename, setPredictionsFilename] = useState<string | undefined>();

  useEffect(() => {
    if (!taskId) return;
    getTaskById(taskId)
      .then((data) => {
        const t: Task = data.task ?? data;
        setTask(t);
        if (t.evalResults?.predictionsFilename) {
          setPredictionsFilename(t.evalResults.predictionsFilename);
        }
      })
      .catch(() => toast.error("Failed to load task"))
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    let id: ReturnType<typeof setInterval>;
    getValEvalProgress(taskId).then((p) => {
      if (p.total > 0 && !p.done && p.completed < p.total) {
        setIsRunning(true);
        setProgress({ completed: p.completed, total: p.total });
        id = setInterval(async () => {
          try {
            const prog = await getValEvalProgress(taskId);
            setProgress({ completed: prog.completed, total: prog.total });
            if (prog.done || prog.completed >= prog.total) { clearInterval(id); setIsRunning(false); }
          } catch {}
        }, 1500);
      }
    }).catch(() => {});
    return () => clearInterval(id);
  }, [taskId]);

  const handleRunEval = async () => {
    if (!taskId) return;
    setIsRunning(true);
    setProgress({ completed: 0, total: 0 });

    const pollInterval = setInterval(async () => {
      try {
        const p = await getValEvalProgress(taskId);
        setProgress({ completed: p.completed, total: p.total });
        if (p.done) clearInterval(pollInterval);
      } catch {
        // ignore transient polling errors
      }
    }, 1500);

    try {
      const res = await runValEvaluation(taskId);
      clearInterval(pollInterval);
      if (res.success && res.predictionsFilename) {
        setPredictionsFilename(res.predictionsFilename);
        setTask((prev) => prev && res.evalResults ? { ...prev, evalResults: res.evalResults } : prev);
        toast.success("Evaluation complete");
      } else {
        toast.error(res.message || "Evaluation failed");
      }
    } catch {
      clearInterval(pollInterval);
      toast.error("Evaluation failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownload = async () => {
    if (!predictionsFilename) return;
    try {
      const blob = await downloadMetricsFile(predictionsFilename);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = predictionsFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download evaluation results");
    }
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Text c="dimmed">Loading task...</Text>
      </Container>
    );
  }

  if (!task) {
    return (
      <Container size="lg" py="xl">
        <Text c="red">Task not found.</Text>
        <Button mt="md" variant="subtle" onClick={() => navigate("/")}>Go home</Button>
      </Container>
    );
  }

  const evalDone = Boolean(predictionsFilename);

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <Title order={2}>Task Dashboard</Title>
          <Button variant="subtle" size="xs" onClick={() => navigate(-1)}>← Back</Button>
        </Group>

        {/* Task details + eval button row */}
        <Paper withBorder p="lg" radius="md">
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xl">
            <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Task</Text>
                <Text fw={700} size="lg">{task.name}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Description</Text>
                <Text size="sm">{task.description}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>Labels</Text>
                <Group gap="xs" wrap="wrap">
                  {task.labels.map((l) => (
                    <Badge key={l.name} variant="light" size="sm">{l.name}</Badge>
                  ))}
                </Group>
              </div>
              {task.codebook && task.codebook.length > 0 && (
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                    Final Codebook ({task.codebook.length} rules)
                  </Text>
                  <Stack gap={4}>
                    {task.codebook.map((rule, i) => (
                      <Text key={i} size="sm">• {rule}</Text>
                    ))}
                  </Stack>
                </div>
              )}
            </Stack>

            <Box style={{ flexShrink: 0, alignSelf: "center" }}>
              <Button
                size="md"
                color="teal"
                loading={isRunning}
                disabled={isRunning}
                onClick={handleRunEval}
              >
                Run Final Evaluation
              </Button>
            </Box>
          </Group>
        </Paper>

        {/* Progress */}
        {isRunning && (
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              {progress.total > 0
                ? `${progress.completed} / ${progress.total} rows evaluated`
                : "Starting evaluation..."}
            </Text>
            {progress.total > 0 && (
              <Progress
                value={(progress.completed / progress.total) * 100}
                animated
                size="sm"
              />
            )}
          </Stack>
        )}

        {/* Results */}
        {evalDone && (
          <>
            <Divider />
            <Stack gap="sm">
              {task.evalResults && (
                <Group gap="xl">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Macro F1</Text>
                    <Text fw={700} size="lg">{Math.round(task.evalResults.macroF1 * 100)}%</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Accuracy</Text>
                    <Text fw={700} size="lg">{Math.round(task.evalResults.accuracy * 100)}%</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Samples</Text>
                    <Text fw={700} size="lg">{task.evalResults.numSamples}</Text>
                  </div>
                </Group>
              )}
              <Button
                variant="light"
                color="teal"
                onClick={handleDownload}
                style={{ alignSelf: "flex-start" }}
              >
                Download Evaluation Results
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  );
}
