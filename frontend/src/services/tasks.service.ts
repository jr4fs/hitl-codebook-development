import {
  AutoLabelProgressResponse,
  CreateAutoLabelTaskRequest,
  CreateAutoLabelTaskResponse,
  CreateTaskRequest,
  CreateTaskResponse,
  StartAutoLabelJobRequest,
  StartAutoLabelJobResponse,
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

export async function exportCodebookSnapshot(
  taskId: string,
  codebook: string[],
  lastPrompt: string,
) {
  const { data } = await apiClient.post<{ success: boolean; message?: string }>(
    "/api/tasks/exportCodebook",
    { taskId, codebook, lastPrompt },
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
  textColumn: string;
  labelColumn: string;
  modelName: string;
  coverageN?: number;
  useRepresentativeSampling?: boolean;
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
  formData.append("text_column", String(params.textColumn));
  formData.append("label_column", String(params.labelColumn));
  formData.append("model_name", String(params.modelName));
  formData.append("coverage_n", String(params.coverageN ?? 150));
  formData.append(
    "use_representative_sampling",
    String(Boolean(params.useRepresentativeSampling)),
  );

  const { data } = await apiClient.post("/api/tasks/create", formData, {
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

export async function downloadAnnotationOutputFile(filename: string): Promise<Blob> {
  const response = await apiClient.get(
    `/api/tasks/download-output/${encodeURIComponent(filename)}`,
    { responseType: "blob" },
  );
  return response.data as Blob;
}

export async function uploadOutputFile(file: File): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<UploadFileResponse>(
    "/api/tasks/upload-output",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function createAutoLabelTask(
  payload: CreateAutoLabelTaskRequest,
): Promise<CreateAutoLabelTaskResponse> {
  const { data } = await apiClient.post<CreateAutoLabelTaskResponse>(
    "/api/tasks/createAutoLabelTask",
    payload,
  );
  return data;
}

export async function startAutoLabelJob(
  payload: StartAutoLabelJobRequest,
): Promise<StartAutoLabelJobResponse> {
  const { data } = await apiClient.post<StartAutoLabelJobResponse>(
    "/api/tasks/auto-label",
    payload,
  );
  return data;
}

export async function getAutoLabelProgress(
  taskId: string,
): Promise<AutoLabelProgressResponse> {
  const { data } = await apiClient.get<AutoLabelProgressResponse>(
    `/api/tasks/auto-label/progress/${taskId}`,
    { timeout: 5_000 },
  );
  return data;
}

export async function completeAutoLabelTask(
  taskId: string,
  outputFile: string,
): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch<{ success: boolean }>(
    `/api/tasks/auto-label/complete/${taskId}`,
    { outputFile },
  );
  return data;
}

export async function deleteTaskById(taskId: string): Promise<{
  success: boolean;
  message?: string;
  deletedTaskId?: string;
  deletedFilesCount?: number;
  deletedAnnotationsCount?: number;
}> {
  const { data } = await apiClient.delete(`/api/tasks/delete/${taskId}`);
  return data;
}
