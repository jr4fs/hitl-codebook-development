import { Task } from "@common/types/tasks";
import {
  Text,
  Paper,
  Title,
  Group,
  Button,
  Textarea,
  Stack,
  ScrollArea,
  LoadingOverlay
} from "@mantine/core";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { inference } from "../services/inference.service";
import { InferenceRequest, InferenceResponse } from "@common/types/inference";

export default function AnnotationPage() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false); //remove?
  const [isIncorrect, setIsIncorrect] = useState<boolean>(false);
  const [totalCorrect, setTotalCorrect] = useState<number>(0);
  const [totalIncorrect, setTotalIncorrect] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>("");
  const [currentUserInput, setCurrentUserInput] = useState<string>("");
  const { subsampledCsv, task } = location.state as {
    subsampledCsv: Record<string, string>[];
    task: Task;
  };
  const [generatedLabel, setGeneratedLabel] = useState<string>("Click next to generate this content");
  const [generatedSpanText, setGeneratedSpanText] = useState<string>("Click next to generate this content");
  const [generatedReasoning, setGeneratedReasoning] = useState<string>("Click next to generate this content");
  const datasetShuffler = (
    dataset: Record<string, string>[],
    ratio: number,
  ) => {
    const n = dataset.length;
    for (let i = n - 1; i > 0; i--) {
      const randIndex = Math.floor(Math.random() * (i + 1));
      [dataset[i], dataset[randIndex]] = [dataset[randIndex], dataset[i]];
    }
    const splitIndex = Math.floor(n * ratio);
    return {
      tenPercent: dataset.slice(0, splitIndex),
      ninetyPercent: dataset.slice(splitIndex),
    };
  };

  const [workingSamples, setWorkingSamples] = useState(() => {
    return subsampledCsv && subsampledCsv.length
      ? datasetShuffler([...subsampledCsv], 0.2) // setting budget at 20% of the input dataset
      : null;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSample = workingSamples?.tenPercent[currentIndex];
  const totalSamples = workingSamples?.tenPercent.length || 0;

  const handleClickAnnotation = async () => {
    if (!currentSample) return;
    setIsLoading(true);
    const payload: InferenceRequest = {
      labels: task.labels,
      task_definition: task.description,
      case_notes: currentSample[task.columns[0]],
      model_name: "mistral:7b",
      task_type: "annotation",
      user_input: userInput // cumulative user feedback
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
        {/* count of how many samples have been processed/chosen */}
        <Title order={4}>
          Sample {currentIndex + 1}/{totalSamples}
        </Title>

        {/* Case notes text */}
        <ScrollArea h="250">
          <Text>
            {currentSample && currentSample[task.columns[0]]
              ? currentSample[task.columns[0]]
              : "No text found for this sample. Pleas proceed to the next sample."}
          </Text>
        </ScrollArea>

        {/* Geenrated content: label, span text and reasoning */}
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

        {/* user input button to confirm correctness of generated content */}
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
        {/* "Next" button moves to next sample in the budget subset */}
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
