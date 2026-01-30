// hooks/useTaskData.ts
import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { getTaskById, getCsvData } from '../services/tasks.service';
import { Task } from '@common/types/tasks';

interface CsvRow {
  [key: string]: string;
}

interface NavProps {
  csvData?: CsvRow[];
  headers?: string[];
  fileName?: string;
  task?: Task;
}

export const useTaskData = () => {
  const { taskId } = useParams<{ taskId?: string }>();
  const location = useLocation();
  const navProps = location.state as NavProps | undefined;
  
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Case 1: Data passed via navigation state (new upload from LandingPage)
      if (navProps?.csvData && navProps?.headers && navProps?.fileName) {
        console.log('Using navigation state data');
        setCsvData(navProps.csvData);
        setHeaders(navProps.headers);
        setFileName(navProps.fileName);
        if (navProps.task) {
          setTask(navProps.task);
        }
        return;
      }

      // Case 2: Load task from database via taskId (from Sidebar)
      if (!taskId) {
        console.log('No taskId and no navProps - empty state');
        return;
      }
      
      console.log('Fetching task from backend:', taskId);
      setLoading(true);
      try {
        // Fetch task
        const taskResponse = await getTaskById(taskId);
        setTask(taskResponse.task);
        
        // Fetch CSV data associated with task
        const csvResponse = await getCsvData(taskResponse.task.file);
        setCsvData(csvResponse.data || []);
        setHeaders(csvResponse.headers || []);
        setFileName(taskResponse.task.file);
      } catch (error) {
        console.error('Failed to fetch task data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskId]); // Remove navProps from dependencies to avoid re-fetching

  return { loading, csvData, headers, fileName, task };
};