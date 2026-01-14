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
} from "@mantine/core";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createTask } from "../services/tasks.service";
import { Task } from "@common/types/tasks";
//import Papa from "papaparse";
import styles from "../components/layout/styles/Subsampling.module.css";

const MAX_ROWS_PER_PAGE = 10;

// interface Task {
//   name: string;
//   description: string;
//   type: string;
//   labels: Array<LabelItem> | null;
// }

interface CsvRow {
  [key: string]: string;
}

interface NavProps {
  csvData: CsvRow[];
  headers: string[];
  fileName: string;
}

interface LabelItem {
  name: string;
  keywords: Array<string>;
}

export default function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navProps = location.state as NavProps;
  const [taskName, setTaskName] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskType, setTaskType] = useState<"Multiclass" | "Single-class">("Multiclass");
  const [taskLabels, setTaskLabels] = useState<LabelItem[]>([
    { name: "", keywords: [] },
  ]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [chosenCol, setChosenCol] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<CsvRow[]>([]);

  // Redirect back if no data
  useEffect(() => {
    if (!navProps?.csvData || !navProps?.headers) {
      navigate("/");
    }
  });

  const { csvData, headers, fileName } = navProps;

  // Filter CSV data based on chosen columns
  useEffect(() => {
    if (chosenCol.length > 0) {
      const filtered = csvData.filter((row) => {
        return chosenCol.every((col) => {
          const value = row[col];
          return value !== null && value !== undefined && value.trim() !== "";
        });
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilteredData(filtered);
      setCurrentPage(1); // Reset pagination when filtering
    } else {
      setFilteredData(csvData);
      setCurrentPage(1);
    }
  }, [chosenCol, csvData]);

  const displayData = filteredData.length > 0 ? filteredData : csvData;
  //calculations for pagination
  const totalPages = Math.ceil(displayData.length / MAX_ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * MAX_ROWS_PER_PAGE;
  const endIndex = startIndex + MAX_ROWS_PER_PAGE;
  const paginatedData = displayData.slice(startIndex, endIndex);

  const addLabelItem = () => {
    setTaskLabels((prev) => [...prev, { name: "", keywords: [] }]);
  };

  const removeLabelItem = (index: number) => {
    setTaskLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLabelName = (index: number, name: string) => {
    setTaskLabels((prev) =>
      prev.map((item, i) => (i === index ? { ...item, name } : item))
    );
  };

  const updateLabelKeywords = (index: number, keywords: string[]) => {
    setTaskLabels((prev) =>
      prev.map((item, i) => (i === index ? { ...item, keywords } : item))
    );
  };

  const handleSaveTaskState = async() =>{
    const payload: Task = {
        name: taskName,
        description: taskDesc,
        type: taskType,
        labels: taskLabels,
        userID: "TestUser12345",
        file:"MFP_4_anonymized-USC Version - MFP_4_anonymized (3)_2026-01-13_011755.csv",
        createdAt: new Date().toISOString()
      };
    
      const response = await createTask(payload)
      if(response.success){
        console.log("Saved Task state successfully");
      }
      else{
        console.log("Error saving task state: ",response.errors);
      }
  }

  const handleSubsampling = () => {
    if (taskName && taskDesc && taskType && taskLabels.length > 0) {
      // const task: Task = {
      //   name: taskName,
      //   description: taskDesc,
      //   type: taskType,
      //   labels: taskLabels,
      // };

      console.log("Current Task Obj: ");
    }
  };

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
            onChange={(_value) => setTaskType(_value as "Multiclass" | "Single-class")}
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
          </Center>
        </Stack>
      </Box>

      <Box w="65%" h="100%">
        <Stack c="#D8D8D8" h="100%" gap="md">
        <Paper  bg="#1C1A1A" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Title order={4}> {fileName}</Title>
          <Text c="dimmed" fz="md">
            {displayData.length} rows
          </Text>
          <Table.ScrollContainer minWidth={500} style={{ flex: 1, overflow: 'auto' }}>
            <Table withColumnBorders withTableBorder borderColor="#D8D8D8">
              <Table.Thead>
                <Table.Tr>
                  {headers.map((header, index) => (
                    <Table.Th key={index}>{header}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedData.map((row, rowIndex) => (
                  <Table.Tr key={rowIndex}>
                    {headers.map((header, cellIndex) => (
                      <Table.Td key={cellIndex}>{row[header]}</Table.Td>
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
