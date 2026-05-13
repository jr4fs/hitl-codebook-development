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
  taskJsonFile?: File;
  taskName?: string;
  taskDescription?: string;
  taskType?: "Multiclass" | "Single-class";
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
  if (params.taskJsonFile) {
    formData.append("task_json", params.taskJsonFile);
  }
  if (params.taskName) {
    formData.append("task_name", params.taskName);
  }
  if (params.taskDescription) {
    formData.append("task_description", params.taskDescription);
  }
  if (params.taskType) {
    formData.append("task_type", params.taskType);
  }
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
