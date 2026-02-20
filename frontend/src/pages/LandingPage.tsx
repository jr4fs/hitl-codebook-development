import {
  Text,
  Center,
  Stack,
  Table,
  Title,
  Paper,
  Pagination,
  Group,
  Button,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowBadgeRightFilled,
  IconUpload,
  IconX,
  IconFile,
  IconSettings,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCsvData, uploadFile } from "../services/tasks.service";
import AnonymizeConfigModal from "../components/anonymize/AnonymizeConfigModal";

const MAX_ROWS_PER_PAGE = 50;

interface CsvRow {
  [key: string]: string;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [configModalOpened, { open: openConfigModal, close: closeConfigModal }] = useDisclosure(false);

  //calculations for pagination
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
        console.log("Error uploading csv: ",response.errors);
      }
    }
  };

  if (csvData.length === 0) {
    return (
      <>
        <Dropzone
          onDrop={handleFileUpload}
          accept={["text/csv"]}
          w="100%"
          h="100dvh"
          bg="#000000"
          bd={0}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Stack align="center" h="100%" gap="sm">
            <Dropzone.Accept>
              <IconFile size={36} stroke={1.5} color="#D8D8D8" />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={36} stroke={1.5} color="#ff6b6b" />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconUpload size={36} stroke={1.5} color="#D8D8D8" />
            </Dropzone.Idle>
            <Text c="#D8D8D8">Drop CSV file here or click to upload</Text>
          </Stack>
        </Dropzone>
        <Button
          variant="filled"
          color="blue"
          size="md"
          radius="xl"
          leftSection={<IconSettings size={18} />}
          onClick={(e) => {
            e.stopPropagation();
            openConfigModal();
          }}
          style={{
            position: "fixed",
            bottom: 32,
            right: 32,
            padding: "12px 18px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
          }}
        >
          Configure Anonymization
        </Button>
        <AnonymizeConfigModal opened={configModalOpened} onClose={closeConfigModal} />
      </>
    );
  } else {
    return (
      <Stack bg="#000000" w="100%" h="100vh">
        {fileName && (
          <Title order={1} p="md" c="#D8D8D8">
            {fileName}
          </Title>
        )}
        <Text fz="md" c="dimmed" px="md">
          {csvData.length} rows
        </Text>
        <Paper c="#D8D8D8" bg="#1C1A1A">
          <Table.ScrollContainer minWidth={500} h={850}>
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
        <Center w="100%">
          <Button
            variant="filled"
            color="#2C2C2C"
            w="auto"
            p="sm"
            h="auto"
            radius={50}
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
            Go to Subsampling <IconArrowBadgeRightFilled />
          </Button>
        </Center>
      </Stack>
    );
  }
}
