// hooks/useTaskData.ts
import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { getTaskById, getCsvData } from '../services/tasks.service';
import { getTaskAnnotations } from '../services/annotations.service';
import { Task } from '@common/types/tasks';
import { AnnotationItem } from '@common/types/annotations';

interface CsvRow {
  [key: string]: string;
}

interface NavProps {
  csvData?: CsvRow[];
  headers?: string[];
  fileName?: string;
  task?: Task;
  subsampledCsv?: CsvRow[];
  annotations?: AnnotationItem[];
}

export const useTaskData = () => {
  const { taskId } = useParams<{ taskId?: string }>();
  const location = useLocation();
  const navProps = location.state as NavProps | undefined;

  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [subsampledData, setSubsampledData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [task, setTask] = useState<Task | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Case 1: Data passed via navigation state (new upload from LandingPage or SubsamplingPage)
      if (navProps?.csvData && navProps?.headers && navProps?.fileName) {
        console.log("Using navigation state data");
        setCsvData(navProps.csvData);
        setHeaders(navProps.headers);
        setFileName(navProps.fileName);
        if (navProps.subsampledCsv) {
          setSubsampledData(navProps.subsampledCsv);
        }
        if (navProps.task) {
          setTask(navProps.task);
        }
        if (navProps.annotations) {
          setAnnotations(navProps.annotations);
        }
        return;
      }

      // Case 2: Load task from database via taskId (from Sidebar or direct URL)
      if (!taskId) {
        console.log("No taskId and no navProps - empty state");
        return;
      }

      console.log("Fetching task from backend:", taskId);
      setLoading(true);
      try {
        // Fetch task
        const taskResponse = await getTaskById(taskId);
        setTask(taskResponse.task);

        // Fetch CSV data associated with task
        const csvResponse = await getCsvData(taskResponse.task.file);
        setCsvData(csvResponse.data || []);
        setSubsampledData(csvResponse.val_data || []);
        setHeaders(csvResponse.headers || []);
        setFileName(taskResponse.task.file);

        // Fetch annotations
        const annotationsResponse = await getTaskAnnotations(taskId);
        if (annotationsResponse.success) {
          setAnnotations(annotationsResponse.annotations || []);
        }
      } catch (error) {
        console.error("Failed to fetch task data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskId]);

  return { loading, csvData, subsampledData, headers, fileName, task, annotations };
};