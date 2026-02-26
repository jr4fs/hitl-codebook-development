import {
  CreateTaskRequest,
  CreateTaskResponse,
  TaskQueryResponse,
  UploadFileResponse,
  UpdateTaskRequest,
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

export async function getTaskById(taskId: string) {
  const { data } = await apiClient.get(`/api/tasks/getTask/${taskId}`);
  return data;
}

export async function getCsvData(fileName: string) {
  const { data } = await apiClient.get(
    `/api/tasks/csv/${encodeURIComponent(fileName)}`,
  );
  return data;
}

export async function checkValFileExists(fileName: string): Promise<boolean> {
  const { data } = await apiClient.get<{ success: boolean; exists: boolean }>(
    `/api/tasks/checkValFile/${encodeURIComponent(fileName)}`,
  );
  return data.exists;
}
