import {
  Text,
  Center,
  Stack,
  Table,
  Title,
  Paper,
  Pagination,
  Group,
  ScrollArea,
  MultiSelect,
  TextInput,
  Select,
  Box,
  Flex,
  Textarea,
  ActionIcon,
  TagsInput,
  Button,
  LoadingOverlay,
} from "@mantine/core";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createTask, checkValFileExists } from "../services/tasks.service";
import { embedDataset } from "../services/embedding.service";
import { EmbedDatasetRequest } from "@common/types/embedding";
import { Task } from "@common/types/tasks";
import { useSelector } from "react-redux";
import { IRootState } from "../store/store";
import styles from "../components/layout/styles/Subsampling.module.css";
import { useTaskData } from "../hooks/useTaskData";
import { LabelItem } from "@common/types/tasks";

const MAX_ROWS_PER_PAGE = 10;

export default function SubsamplingPage() {
  const navigate = useNavigate();
  const { loading, csvData, headers, fileName, task } = useTaskData();
  const [taskName, setTaskName] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskType, setTaskType] = useState<"Multiclass" | "Single-class">(
    "Multiclass",
  );
  const [taskLabels, setTaskLabels] = useState<LabelItem[]>([
    { name: "", definition: "", keywords: [] },
  ]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [chosenCol, setChosenCol] = useState<string[]>([]);
  //const [filteredData, setFilteredData] = useState<CsvRow[]>([]);
  const [subsampledCsv, setSubsampledCsv] = useState<Record<string, unknown>[]>(
    [],
  );
  const [valDataExists, setValDataExists] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<boolean>(false);

  const user = useSelector((state: IRootState) => state.user.user);

  useEffect(() => {
    if (task) {
      setTaskName(task.name);
      setTaskDesc(task.description);
      setChosenCol(task.columns);
      setTaskType(task.type);
      setTaskLabels(
        task.labels || [{ name: "", definition: "", keywords: [] }],
      );
    }
  }, [task]);

  useEffect(() => {
    const checkValidation = async () => {
      if (fileName) {
        const exists = await checkValFileExists(fileName);
        setValDataExists(exists);
      }
    };
    checkValidation();
  }, [fileName]);

  // TODO: Filter CSV data based on chosen columns
  // useEffect(() => {
  //   if (chosenCol.length > 0) {
  //     const filtered = csvData.filter((row) => {
  //       return chosenCol.every((col) => {
  //         const value = row[col];
  //         return value !== null && value !== undefined && value.trim() !== "";
  //       });
  //     });
  //     setFilteredData(filtered);
  //     setCurrentPage(1); // Reset pagination when filtering
  //   } else {
  //     setFilteredData(csvData);
  //     setCurrentPage(1);
  //   }
  // }, [chosenCol, csvData]);

  // Determine which data to display - subsampled takes priority
  const displayData = subsampledCsv.length > 0 ? subsampledCsv : csvData;

  // Get headers from the appropriate source
  const displayHeaders = useMemo(() => {
    if (displayData.length > 0) {
      return Object.keys(displayData[0]);
    }
    return [];
  }, [displayData]);
  // Calculations for pagination
  const totalPages = Math.ceil(displayData.length / MAX_ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * MAX_ROWS_PER_PAGE;
  const endIndex = startIndex + MAX_ROWS_PER_PAGE;
  const paginatedData = displayData.slice(startIndex, endIndex);

  const addLabelItem = () => {
    setTaskLabels((prev) => [
      ...prev,
      { name: "", definition: "", keywords: [] },
    ]);
  };

  const removeLabelItem = (index: number) => {
    setTaskLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLabelName = (index: number, name: string) => {
    setTaskLabels((prev) =>
      prev.map((item, i) => (i === index ? { ...item, name } : item)),
    );
  };

  const updateLabelDefinition = (index: number, definition: string) => {
    setTaskLabels((prev) =>
      prev.map((item, i) => (i === index ? { ...item, definition } : item)),
    );
  };

  const updateLabelKeywords = (index: number, keywords: string[]) => {
    setTaskLabels((prev) =>
      prev.map((item, i) => (i === index ? { ...item, keywords } : item)),
    );
  };

  const handleSaveTaskState = async () => {
    const payload: Task = {
      name: taskName,
      description: taskDesc,
      type: taskType,
      labels: taskLabels,
      columns: chosenCol,
      userID: user?.id || "00000",
      file: fileName,
      createdAt: new Date().toISOString(),
    };

    const response = await createTask(payload);
    if (response.success) {
      console.log("Saved Task state successfully");
    } else {
      console.log("Error saving task state: ", response.errors);
    }
  };

  const handleSubsampling = async () => {
    // Validate required fields
    if (!taskName || !taskDesc || !taskType || taskLabels.length === 0) {
      console.error("Please fill in all required task fields");
      return;
    }

    // Validate that a column is selected
    if (!chosenCol || chosenCol.length === 0 || !chosenCol[0]) {
      console.error("Please select at least one column for annotation");
      return;
    }

    // Validate that all labels have required fields
    const invalidLabels = taskLabels.filter(
      (label) =>
        !label.name?.trim() ||
        !label.definition?.trim() ||
        !label.keywords ||
        label.keywords.length === 0,
    );

    if (invalidLabels.length > 0) {
      console.error(
        "All labels must have a name, definition, and at least one keyword",
      );
      return;
    }

    try {
      // Save task in DB
      setLoading(true);
      handleSaveTaskState();
      const payload: EmbedDatasetRequest = {
        file_path: fileName,
        text_col: chosenCol,
        labels: taskLabels.filter(
          (label) =>
            label.name?.trim() &&
            label.definition?.trim() &&
            label.keywords &&
            label.keywords.length > 0,
        ),
      };

      console.log("Sending payload to backend:", payload);
      const response = await embedDataset(payload);
      if (response.success) {
        console.log("Subsampling completed successfully");
        if (response.val_data && response.val_data.length > 0) {
          setSubsampledCsv(response.val_data);
          setValDataExists(true);
        }
      } else {
        console.error("Subsampling failed:", response);
      }
    } catch (error: any) {
      console.error("Error performing subsampling:", error);
      if (error?.response?.data) {
        console.error("Backend error details:", error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center h="100vh" bg="#1C1A1A">
        <Text c="white" size="lg">
          Loading task data...
        </Text>
      </Center>
    );
  }

  // Handle empty data
  if (!csvData || csvData.length === 0 || !headers || headers.length === 0) {
    return (
      <Center h="100vh" bg="#1C1A1A">
        <Stack align="center" gap="md">
          <Text c="white" size="lg">
            No data available
          </Text>
          <Text c="dimmed">Please upload a CSV file to get started</Text>
          <Button onClick={() => navigate("/")}>Upload CSV File</Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Flex
      gap="md"
      h="100dvh"
      justify="flex-start"
      direction="row"
      wrap="nowrap"
      bg="#1C1A1A"
    >
      <Box w="30%" h="100%" c="white">
        <Stack w="100%" h="100%" gap="md" justify="flex-start">
          <MultiSelect
            ml="15"
            mr="15"
            bg="#1C1A1A"
            variant="filled"
            fz="lg"
            label="Select columns to use for annotation"
            placeholder="Select columns"
            clearable
            searchable
            nothingFoundMessage="Column does not exist"
            limit={5}
            data={headers}
            value={chosenCol}
            onChange={setChosenCol}
            comboboxProps={{
              transitionProps: { transition: "pop", duration: 200 },
            }}
            classNames={{
              input: styles.input,
              dropdown: styles.dropdown,
              option: styles.option,
            }}
          ></MultiSelect>
          <Title order={4} c="#D8D8D8" ml="15" mr="15">
            Task Definition
          </Title>
          <TextInput
            ml="15"
            mr="15"
            variant="filled"
            label="Task name"
            placeholder="Enter task name"
            value={taskName}
            onChange={(event) => setTaskName(event.currentTarget.value)}
            classNames={{
              input: styles.input,
            }}
          />
          <Textarea
            ml="15"
            mr="15"
            variant="filled"
            label="Task Description"
            placeholder="Enter task description"
            value={taskDesc}
            onChange={(event) => setTaskDesc(event.currentTarget.value)}
            classNames={{
              input: styles.input,
            }}
          />
          <Select
            ml="15"
            mr="15"
            variant="filled"
            label="Select task type"
            placeholder="Pick value"
            data={["Multiclass", "Single-class"]}
            value={taskType}
            onChange={(_value) =>
              setTaskType(_value as "Multiclass" | "Single-class")
            }
            classNames={{
              input: styles.input,
              dropdown: styles.dropdown,
              option: styles.option,
            }}
          />
          <ScrollArea
            ml="15"
            mr="15"
            h="100%"
            offsetScrollbars
            scrollbarSize={6}
            type="hover"
          >
            <Stack gap="md" pb="sm">
              {taskLabels.map((label, idx) => (
                <Paper
                  key={idx}
                  p="sm"
                  radius="md"
                  bg="#222020"
                  withBorder
                  style={{ borderColor: "#3A3A3A" }}
                >
                  <Group justify="space-between" align="center" mb="xs">
                    <Text fw={600} c="#D8D8D8">
                      Label {idx + 1}
                    </Text>

                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => removeLabelItem(idx)}
                      disabled={taskLabels.length === 1}
                      title={
                        taskLabels.length === 1
                          ? "At least 1 label is required"
                          : "Remove label"
                      }
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>

                  <Stack gap="xs">
                    <TextInput
                      variant="filled"
                      label="Label name"
                      placeholder={`Enter name for label ${idx + 1}`}
                      value={label.name}
                      onChange={(e) =>
                        updateLabelName(idx, e.currentTarget.value)
                      }
                      classNames={{ input: styles.input }}
                    />

                    <TextInput
                      variant="filled"
                      label="Label Description"
                      placeholder={`Enter description for label ${idx + 1}`}
                      value={label.definition}
                      onChange={(e) =>
                        updateLabelDefinition(idx, e.currentTarget.value)
                      }
                      classNames={{ input: styles.input }}
                    />

                    <TagsInput
                      variant="filled"
                      label="Keywords"
                      placeholder="Type keyword and press Enter"
                      value={label.keywords}
                      onChange={(values) => updateLabelKeywords(idx, values)}
                      clearable
                      classNames={{ input: styles.input }}
                    />
                  </Stack>
                </Paper>
              ))}
              <Center>
                <ActionIcon
                  variant="filled"
                  radius="xl"
                  size="lg"
                  color="gray"
                  onClick={addLabelItem}
                  title="Add label"
                >
                  <IconPlus size={20} />
                </ActionIcon>
              </Center>
            </Stack>
          </ScrollArea>
          <Center>
            <Button
              variant="filled"
              color="#2C2C2C"
              w="200"
              p="sm"
              m="md"
              h="auto"
              mb="lg"
              radius={50}
              onClick={handleSaveTaskState}
            >
              Save Task State
            </Button>
            <Button
              variant="filled"
              color="#2C2C2C"
              w="200"
              p="sm"
              m="md"
              h="auto"
              mb="lg"
              radius={50}
              onClick={handleSubsampling}
            >
              Perform Subsampling
            </Button>
            <Button
              variant="filled"
              color="#2C2C2C"
              w="200"
              p="sm"
              m="md"
              h="auto"
              mb="lg"
              radius={50}
              disabled={!valDataExists}
              onClick={() => {
                navigate(`/manual-annotate/${task?._id}`, {
                  state: {
                    subsampledCsv,
                    task,
                  },
                });
              }}
            >
              Annotate Data
            </Button>
          </Center>
        </Stack>
      </Box>

      <Box w="65%" h="100%">
        <LoadingOverlay
          visible={isLoading}
          zIndex={1000}
          overlayProps={{ radius: 'sm', blur: 2 }}
          loaderProps={{ color: 'white', type: 'bars' }}
        />
        <Stack c="#D8D8D8" h="100%" gap="md">
          <Paper
            bg="#1C1A1A"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Title order={4}> {fileName}</Title>
            <Text c="dimmed" fz="md">
              {displayData.length} rows
            </Text>
            <Table.ScrollContainer
              minWidth={500}
              style={{ flex: 1, overflow: "auto" }}
            >
              <Table withColumnBorders withTableBorder borderColor="#D8D8D8">
                <Table.Thead>
                  <Table.Tr>
                    {displayHeaders.map((header, index) => (
                      <Table.Th key={index}>{header}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedData.map((row, rowIndex) => (
                    <Table.Tr key={rowIndex}>
                      {displayHeaders.map((header, cellIndex) => (
                        <Table.Td key={cellIndex}>{String(row[header])}</Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
          <Group justify="center" p="md">
            <Pagination
              total={totalPages}
              value={currentPage}
              onChange={setCurrentPage}
              color="gray"
              withEdges
              styles={{
                control: {
                  backgroundColor: "#2C2C2C",
                  border: "none",
                  color: "#FFFFFF",
                },
                dots: {
                  color: "#FFFFFF",
                },
              }}
            />
          </Group>
        </Stack>
      </Box>
    </Flex>
  );
}
