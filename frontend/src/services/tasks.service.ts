import {
  CreateTaskRequest,
  CreateTaskResponse,
  TaskQueryResponse,
  UploadFileResponse,
  UpdateTaskRequest,
  Task,
} from "@common/types/tasks";
import { apiClient } from "../lib/apiClient";

export async function createTask(
  payload: CreateTaskRequest | UpdateTaskRequest,
): Promise<CreateTaskResponse> {
  const { data } = await apiClient.post<CreateTaskResponse>(
    "/api/tasks/createTask",
    payload,
  );
  return data;
}

export async function getUserTasks(): Promise<TaskQueryResponse> {
  const { data } =
    await apiClient.get<TaskQueryResponse>(`/api/tasks/getTasks`);
  return data;
}

export async function saveTaskCodebook(taskId: string, codebook: string[]) {
  const { data } = await apiClient.post<{ success: boolean; message?: string }>(
    "/api/tasks/saveCodebook",
    { taskId, codebook },
  );
  return data;
}

export async function uploadFile(file: File): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<UploadFileResponse>(
    "/api/tasks/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  console.log(data);
  return data;
}

export async function uploadTaskBundle(params: {
  dValFile: File;
  dAllFile: File;
  taskJsonFile: File;
  labelsJsonFile: File;
}): Promise<{
  success: boolean;
  message?: string;
  taskId?: string;
  fileName?: string;
  restFileName?: string;
  valFileName?: string;
  valSummary?: {
    rows: number;
    columns: string[];
  };
  restSummary?: {
    rows: number;
    columns: string[];
  };
  task?: Task;
}> {
  const formData = new FormData();
  formData.append("d_val", params.dValFile);
  formData.append("d_all", params.dAllFile);
  formData.append("task_json", params.taskJsonFile);
  formData.append("labels_json", params.labelsJsonFile);

  const { data } = await apiClient.post("/api/tasks/upload-bundle", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export async function getTaskById(taskId: string) {
  const { data } = await apiClient.get(`/api/tasks/getTask/${taskId}`);
  return data;
}

export async function getCsvData(fileName: string, valFileName?: string) {
  const valQuery = valFileName
    ? `?valFile=${encodeURIComponent(valFileName)}`
    : "";
  const { data } = await apiClient.get(
    `/api/tasks/csv/${encodeURIComponent(fileName)}${valQuery}`,
  );
  return data;
}

export async function checkValFileExists(fileName: string): Promise<boolean> {
  const { data } = await apiClient.get<{ success: boolean; exists: boolean }>(
    `/api/tasks/checkValFile/${encodeURIComponent(fileName)}`,
  );
  return data.exists;
}
