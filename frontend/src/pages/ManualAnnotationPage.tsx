import {
    Text,
    Paper,
    Title,
    Group,
    Button,
    Stack,
    ScrollArea,
    Center,
    LoadingOverlay,
    Alert,
    Box
} from "@mantine/core";
import { IconInfoCircle, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskData } from "../hooks/useTaskData";
import { addAnnotation, updateAnnotation } from "../services/annotations.service";

export default function ManualAnnotationPage() {
    const navigate = useNavigate();
    const { loading, subsampledData, task, annotations } = useTaskData();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentLabels, setCurrentLabels] = useState<string[]>([]);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const totalSamples = subsampledData?.length || 0;
    const currentSample = subsampledData && currentIndex < totalSamples ? subsampledData[currentIndex] : null;
    const isCompleted = currentIndex >= 7/*totalSamples*/;

    // Set initial index based on existing annotations
    useEffect(() => {
        if (!loading && annotations && subsampledData && subsampledData.length > 0) {
            // Find the first index that hasn't been annotated yet
            const firstUnannotatedIndex = subsampledData.findIndex(sample =>
                !annotations.some(ann => ann.sampleId === Number(sample.example_id))
            );

            if (firstUnannotatedIndex !== -1) {
                setCurrentIndex(firstUnannotatedIndex);
            } else {
                setCurrentIndex(subsampledData.length);
            }
        }
    }, [loading, annotations, subsampledData]);

    // Update/Reset current labels when index changes
    useEffect(() => {
        if (currentSample && annotations) {
            const existingAnnotation = annotations.find(
                a => a.sampleId === Number(currentSample.example_id)
            );
            setCurrentLabels(existingAnnotation ? existingAnnotation.labels : []);
        } else {
            setCurrentLabels([]);
        }
        setStatus(null);
    }, [currentIndex, annotations]);

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

    const handleLabelClick = (label: string) => {
        if (currentLabels.includes(label)) {
            setCurrentLabels(currentLabels.filter(l => l !== label));
        }
        else {
            setCurrentLabels([...currentLabels, label]);
        }
    }

    const handleSaveClick = async () => {
        if (currentLabels.length === 0) {
            setStatus({ type: 'error', message: "Please select at least one label" });
            return;
        }

        if (!task?._id || !currentSample) return;

        setIsSaving(true);
        try {
            const existingAnnotation = annotations?.find(
                a => a.sampleId === Number(currentSample.example_id)
            );
            let response;

            if (existingAnnotation?._id) {
                // Update existing annotation
                response = await updateAnnotation({
                    annotationId: existingAnnotation._id,
                    labels: currentLabels
                });
            } else {
                // Add new annotation
                response = await addAnnotation({
                    taskId: task._id,
                    sampleId: Number(currentSample.example_id),
                    annotationSampleRow: currentSample,
                    labels: currentLabels
                });
            }

            if (response.success) {
                setStatus({ type: 'success', message: "Annotation saved successfully" });
                // Short delay to allow user to review annotation
                setTimeout(() => {
                    if (currentIndex < 10 /*totalSamples*/) {
                        setCurrentIndex(prev => prev + 1);
                    }
                }, 500);
            } else {
                setStatus({ type: 'error', message: response.message || "Failed to save annotation" });
            }
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || "An unexpected error occurred" });
        } finally {
            setIsSaving(false);
        }
    }

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    }

    const handleGoAIAnnotateClick = () => {
        navigate(`/auto-annotate/${task?._id}`, {
            state: {
                subsampledCsv: subsampledData,
                task,
                annotations
            },
        });
    }


    return (
        <Paper h="100%" bg="black" c="#D8D8D8" p="lg">
            <Stack align="center" justify="center" gap="md" maw={900} mx="auto">
                <Group justify="space-between" w="100%">
                    <Title order={3} c="white">Manual Annotation</Title>
                    <Text size="sm" c="dimmed">
                        {isCompleted ? "All samples completed" : `Sample ${currentIndex + 1} / ${totalSamples}`}
                    </Text>
                </Group>

                {status && (
                    <Alert
                        variant="light"
                        color={status.type === 'success' ? 'green' : (status.type === 'error' ? 'red' : 'blue')}
                        title={status.type === 'success' ? 'Success' : (status.type === 'error' ? 'Error' : 'Info')}
                        icon={status.type === 'success' ? <IconCheck /> : (status.type === 'error' ? <IconAlertCircle /> : <IconInfoCircle />)}
                        w="100%"
                        styles={{
                            message: {
                                color: status.type === 'success' ? 'green' : (status.type === 'error' ? '#E85F59' : 'blue'),
                            }
                        }}
                    >
                        {status.message}
                    </Alert>
                )}

                <Box w="100%">
                    <ScrollArea h={300} bg="#1A1A1A" p="md" style={{ borderRadius: '8px', border: '1px solid #333' }}>
                        {isCompleted ? (
                            <Center h={250}>
                                <Stack align="center">
                                    <IconCheck size={48} color="green" />
                                    <Text size="xl" fw={700}>All samples have been annotated!</Text>
                                    <Text c="dimmed">Review your annotations or proceed to AI-assisted annotation.</Text>
                                </Stack>
                            </Center>
                        ) : (
                            <Text size="lg" style={{ whiteSpace: 'pre-wrap' }}>
                                {currentSample?.["text_combined"] || JSON.stringify(currentSample)}
                            </Text>
                        )}
                    </ScrollArea>
                </Box>

                {!isCompleted && (
                    <>
                        <Group justify="center" wrap="wrap" gap="sm">
                            {task?.labels.map((labelItem) => (
                                <Button
                                    key={labelItem.name}
                                    variant={currentLabels.includes(labelItem.name) ? "filled" : "outline"}
                                    color={currentLabels.includes(labelItem.name) ? "blue" : "gray"}
                                    onClick={() => handleLabelClick(labelItem.name)}
                                    size="md"
                                >
                                    {labelItem.name}
                                </Button>
                            ))}
                        </Group>

                        <Group gap="md" mt="xl">
                            <Button
                                variant="default"
                                onClick={handlePrevious}
                                disabled={currentIndex === 0 || isSaving}
                            >
                                Previous
                            </Button>
                            <Button
                                w={200}
                                color="green"
                                onClick={handleSaveClick}
                                loading={isSaving}
                            >
                                {annotations?.find(a => a.sampleId === Number(currentSample?.example_id))
                                    ? "Update & Next"
                                    : "Save & Next"}
                            </Button>
                        </Group>
                    </>
                )}

                {isCompleted && (
                    <Group mt="xl">
                        <Button variant="default" onClick={handlePrevious}>
                            Go Back to Review
                        </Button>
                        <Button color="blue" onClick={handleGoAIAnnotateClick}>
                            Go to AI Annotation
                        </Button>
                    </Group>
                )}
            </Stack>
        </Paper>
    );
}