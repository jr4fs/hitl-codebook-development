import {
  Badge,
  Box,
  Button,
  Center,
  Container,
  Group,
  Modal,
  Paper,
  Pagination,
  Stack,
  Table,
  Text,
  Title,
  Checkbox,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowRight,
  IconUpload,
  IconX,
  IconFile,
  IconSettings,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCsvData, uploadFile } from "../services/tasks.service";
import AnonymizeConfigModal from "../components/anonymize/AnonymizeConfigModal";
import StepTrackerBanner from "../components/StepTrackerBanner";
import styles from "./DatasetUploadPage.module.css";

const MAX_ROWS_PER_PAGE = 50;

interface CsvRow {
  [key: string]: string;
}

export default function DatasetUploadPage() {
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [introOpen, setIntroOpen] = useState(false);
  const [introDontShow, setIntroDontShow] = useState(false);
  const [introShowCheckbox, setIntroShowCheckbox] = useState(true);
  const [
    configModalOpened,
    { open: openConfigModal, close: closeConfigModal },
  ] = useDisclosure(false);

  const totalPages = Math.ceil(csvData.length / MAX_ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * MAX_ROWS_PER_PAGE;
  const endIndex = startIndex + MAX_ROWS_PER_PAGE;
  const paginatedData = csvData.slice(startIndex, endIndex);

  const handleFileUpload = async (files: File[]) => {
    const inputFile = files[0];
    if (inputFile) {
      console.log("Selected file:", inputFile);
      const response = await uploadFile(inputFile);
      if (response.success) {
        const uploadedFileName = response.filePath ?? "";
        setFileName(uploadedFileName);
        const csvResponse = await getCsvData(uploadedFileName);
        setCsvData((csvResponse.data || []) as CsvRow[]);
        setHeaders(csvResponse.headers || []);
        setCurrentPage(1);
      } else {
        console.log("Error uploading csv: ", response.errors);
      }
    }
  };

  useEffect(() => {
    const hideIntro = localStorage.getItem("hideStep12Intro") === "true";
    if (!hideIntro) {
      setIntroShowCheckbox(true);
      setIntroOpen(true);
    }
  }, []);

  const handleCloseIntro = () => {
    if (introShowCheckbox && introDontShow) {
      localStorage.setItem("hideStep12Intro", "true");
    }
    setIntroOpen(false);
  };

  const handleHelp = () => {
    setIntroShowCheckbox(false);
    setIntroOpen(true);
  };

  if (csvData.length === 0) {
    return (
      <Box className={styles.page}>
        <div className={styles.orbOne} />
        <Modal
          opened={introOpen}
          onClose={handleCloseIntro}
          centered
          title="Steps 1-2: Anonymization and upload"
          overlayProps={{ blur: 2, opacity: 0.5, color: "#11171c" }}
          styles={{
            content: {
              backgroundColor: "rgba(20, 28, 34, 0.98)",
              border: "1px solid rgba(124, 231, 225, 0.25)",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
              color: "#e8eef1",
            },
            header: { backgroundColor: "transparent" },
            title: { color: "#e8eef1", fontWeight: 600 },
            close: { color: "#e8eef1" },
          }}
        >
          <Stack gap="sm">
            <Text>
              Configure anonymization rules, then upload your CSV so the dataset
              is ready for task definition.
            </Text>
            {introShowCheckbox && (
              <Checkbox
                label="Don't show again"
                checked={introDontShow}
                onChange={(event) =>
                  setIntroDontShow(event.currentTarget.checked)
                }
              />
            )}
            <Group justify="flex-end">
              <Button onClick={handleCloseIntro}>Got it</Button>
            </Group>
          </Stack>
        </Modal>
        <Container fluid className={styles.hero}>
          <StepTrackerBanner
            currentStep={2}
            activeSteps={[1, 2]}
            onHelp={handleHelp}
            helpLabel="About steps 1 and 2"
          />
          <Badge className={styles.kicker} variant="light" color="gray">
            Steps 1-2 of 6
          </Badge>
          <Title className={styles.title} mt="md">
            Upload your CSV dataset
          </Title>
          <Text className={styles.subtitle} mt="sm">
            Add the dataset you want to label so you can preview samples before
            defining the task.
          </Text>

          <Paper className={styles.dropCard} mt="lg">
            <Dropzone
              onDrop={handleFileUpload}
              accept={["text/csv"]}
              className={styles.dropzone}
            >
              <Stack align="center" h="100%" gap="sm">
                <Dropzone.Accept>
                  <IconFile
                    size={40}
                    stroke={1.5}
                    className={styles.iconIdle}
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={40} stroke={1.5} className={styles.iconReject} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconUpload
                    size={40}
                    stroke={1.5}
                    className={styles.iconIdle}
                  />
                </Dropzone.Idle>
                <Text className={styles.dropTitle}>Drop CSV file here</Text>
                <Text className={styles.dropHint}>or click to browse</Text>
              </Stack>
            </Dropzone>
          </Paper>

          <Group mt="lg" gap="sm">
            <Button
              variant="light"
              radius="xl"
              className={styles.secondaryCta}
              leftSection={<IconSettings size={18} />}
              onClick={openConfigModal}
            >
              Configure anonymization
            </Button>
          </Group>
        </Container>
        <AnonymizeConfigModal
          opened={configModalOpened}
          onClose={closeConfigModal}
        />
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <div className={styles.orbOne} />
      <Container fluid className={styles.tableSection}>
        <StepTrackerBanner
          currentStep={2}
          activeSteps={[1, 2]}
          onHelp={handleHelp}
          helpLabel="About steps 1 and 2"
        />
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <div>
            <Title className={styles.tableTitle}>
              {fileName || "Dataset preview"}
            </Title>
            <Text className={styles.tableMeta}>{csvData.length} rows</Text>
          </div>
          <Button
            variant="light"
            radius="xl"
            className={styles.secondaryCta}
            leftSection={<IconSettings size={18} />}
            onClick={openConfigModal}
          >
            Configure anonymization
          </Button>
        </Group>

        <Paper className={styles.tableCard} mt="lg">
          <Table.ScrollContainer minWidth={500} h="100%">
            <Table
              withColumnBorders
              withTableBorder
              borderColor="rgba(232, 238, 241, 0.2)"
            >
              <Table.Thead>
                <Table.Tr>
                  {headers.map((header, index) => (
                    <Table.Th key={index} className={styles.tableHeader}>
                      {header}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedData.map((row, rowIndex) => (
                  <Table.Tr key={rowIndex}>
                    {headers.map((header, cellIndex) => (
                      <Table.Td key={cellIndex} className={styles.tableCell}>
                        <div className={styles.tableCellContent}>
                          {row[header]}
                        </div>
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>

        <Group justify="center" mt="lg">
          <Pagination
            total={totalPages}
            value={currentPage}
            onChange={setCurrentPage}
            color="gray"
            withEdges
            styles={{
              control: {
                backgroundColor: "#1a232b",
                border: "none",
                color: "#e8eef1",
              },
              dots: {
                color: "#e8eef1",
              },
            }}
          />
        </Group>
        <Center w="100%" mt="md">
          <Button
            className={styles.primaryCta}
            radius="xl"
            rightSection={<IconArrowRight size={18} />}
            onClick={() => {
              navigate("/new-task", {
                state: {
                  csvData,
                  headers,
                  fileName,
                },
              });
            }}
          >
            Continue to task definition
          </Button>
        </Center>
      </Container>
      <AnonymizeConfigModal
        opened={configModalOpened}
        onClose={closeConfigModal}
      />
    </Box>
  );
}
