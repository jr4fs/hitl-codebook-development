import {
  Text,
  Paper,
  Title,
  Group,
  Button,
  Textarea,
  Stack,
  ScrollArea,
  LoadingOverlay,
  Center
} from "@mantine/core";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { inference } from "../services/inference.service";
import { InferenceRequest, InferenceResponse } from "@common/types/inference";
import { useTaskData } from "../hooks/useTaskData";

export default function AnnotationPage() {
  const navigate = useNavigate();
  const { loading, subsampledData, task } = useTaskData();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false); //remove?
  const [isIncorrect, setIsIncorrect] = useState<boolean>(false);
  const [totalCorrect, setTotalCorrect] = useState<number>(0);
  const [totalIncorrect, setTotalIncorrect] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>("");
  const [currentUserInput, setCurrentUserInput] = useState<string>("");

  const [generatedLabel, setGeneratedLabel] = useState<string>("Click next to generate this content");
  const [generatedSpanText, setGeneratedSpanText] = useState<string>("Click next to generate this content");
  const [generatedReasoning, setGeneratedReasoning] = useState<string>("Click next to generate this content");

  const datasetShuffler = (
    dataset: Record<string, string>[],
    ratio: number,
  ) => {
    const n = dataset.length;
    const shuffled = [...dataset];
    for (let i = n - 1; i > 0; i--) {
      const randIndex = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[randIndex]] = [shuffled[randIndex], shuffled[i]];
    }
    const splitIndex = Math.floor(n * ratio);
    return {
      tenPercent: shuffled.slice(0, splitIndex),
      ninetyPercent: shuffled.slice(splitIndex),
    };
  };

  const [workingSamples, setWorkingSamples] = useState<{
    tenPercent: Record<string, string>[];
    ninetyPercent: Record<string, string>[];
  } | null>(null);

  useEffect(() => {
    if (subsampledData && subsampledData.length > 0 && !workingSamples) {
      setWorkingSamples(datasetShuffler(subsampledData as any, 0.2));
    }
  }, [subsampledData]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSample = workingSamples?.tenPercent[currentIndex];
  const totalSamples = workingSamples?.tenPercent.length || 0;

  if (loading) {
    return (
      <Center h="100vh" bg="black">
        <Stack align="center" gap="md">
          <LoadingOverlay visible={true} overlayProps={{ blur: 2 }} />
          <Text c="white">Loading annotation data...</Text>
        </Stack>
      </Center>
    );
  }

  if (!task || !subsampledData || subsampledData.length === 0) {
    return (
      <Center h="100vh" bg="black">
        <Stack align="center" gap="md">
          <Text c="white">No data available for annotation</Text>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </Stack>
      </Center>
    );
  }

  const handleClickAnnotation = async () => {
    if (!currentSample) return;
    setIsLoading(true);
    const payload: InferenceRequest = {
      labels: task.labels,
      task_definition: task.description,
      case_notes: currentSample["text_combined"],
      model_name: "mistral:7b",
      task_type: "annotation",
      user_input: userInput // Cumulative user feedback
    };
    const response: InferenceResponse = await inference(payload);
    if (response) {
      setGeneratedLabel(response.label);
      setGeneratedSpanText(response.span_text);
      setGeneratedReasoning(response.reason);
    }
    console.log(response);
    setIsLoading(false);
  }

  // Perform annotation for only the first example
  useEffect(() => {
    handleClickAnnotation()
  }, []);

  return (
    <Paper h="100%" bg="black" c="#D8D8D8" p="lg">
      <Stack gap="lg">
        {/* Count of how many samples have been processed/chosen */}
        <Title order={4}>
          Sample {currentIndex + 1}/{totalSamples}
        </Title>

        {/* Case notes text */}
        <ScrollArea h="250">
          <Text>
            {currentSample && (currentSample["text_combined"] || currentSample[task.columns[0]])
              ? currentSample["text_combined"] || currentSample[task.columns[0]]
              : "No text found for this sample. Pleas proceed to the next sample."}
          </Text>
        </ScrollArea>

        {/* Generated content: label, span text and reasoning */}
        <Group justify="start">
          <LoadingOverlay
            visible={isLoading}
            zIndex={1000}
            overlayProps={{ radius: "sm", blur: 2 }}
            loaderProps={{ color: '#D8D8D8', type: 'bars' }}
          />
          <Title order={5}>Generated Labels</Title>
          {generatedLabel ? (
            <Button
              variant="gradient"
              gradient={{
                from: "red",
                to: "rgba(255, 125, 125, 1)",
                deg: 90,
              }}
            >
              {generatedLabel}
            </Button>
          ) : (
            <Text> Error generating label </Text>
          )}
        </Group>
        <Title order={5}>AI Reasoning</Title>
        {generatedReasoning && generatedSpanText ? (
          <div>
            <Text bg="#1e1e1e"> {generatedSpanText} </Text>
            <Text fs="italic">
              {generatedReasoning}
            </Text>
          </div>
        ) : (
          <Text> Error generating reasoning </Text>
        )}

        {/* User input button to confirm correctness of generated content */}
        <Group justify="center">
          <Button
            variant="filled"
            bg="darkgreen"
            onClick={() => {
              setIsCorrect(true);
              setTotalCorrect(totalCorrect + 1);
            }}>
            Correct
          </Button>
          <Button
            variant="filled"
            bg="maroon"
            onClick={() => {
              setIsIncorrect(true);
              setTotalIncorrect(totalIncorrect + 1);
            }}>
            Incorrect
          </Button>
        </Group>

        {/* Display feeback fields if incorrect, "Next" button is disabled until user feedback is filled */}
        {isIncorrect &&
          <div>
            <Title order={5}>Feedback</Title>
            <Textarea
              variant="filled"
              autosize
              minRows={4}
              maxRows={10}
              placeholder="Enter your feedback here"
              styles={{
                input: {
                  backgroundColor: "#1e1e1e",
                  color: "#D8D8D8",
                },
              }}
              onChange={(event) => setCurrentUserInput(event.currentTarget.value)}
            />
          </div>}

        {/* "Next" button is enabled if generated content is correct, if not disabled until user feedback is given */}
        {/* "Next" button moves to next sample in the current batch */}
        <Button
          disabled={!isCorrect || (isIncorrect && currentUserInput.length < 1)}
          onClick={() => {
            if (currentIndex + 1 < totalSamples) {
              setCurrentIndex(currentIndex + 1);
            }
            if (currentUserInput) {
              setUserInput(userInput + "/n" + currentUserInput);
            }
            handleClickAnnotation()
          }}
        >
          Next
        </Button>
      </Stack>
    </Paper>
  );
}
