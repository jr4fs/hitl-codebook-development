import { EvalResults } from "@common/types/tasks";
import { apiClient } from "../lib/apiClient";

export interface GenerateSampleMetricsResponse {
  success: boolean;
  filename?: string;
  message?: string;
}

export interface GenerateMetadataMetricsResponse {
  success: boolean;
  filename?: string;
  message?: string;
}

export interface GenerateBatchMetricsResponse {
  success: boolean;
  filename?: string;
  message?: string;
}

export async function generateSampleMetrics(
  taskId: string,
): Promise<GenerateSampleMetricsResponse> {
  const { data } = await apiClient.post<GenerateSampleMetricsResponse>(
    "/api/metrics/samples",
    { taskId },
  );
  return data;
}

export async function generateMetadataMetrics(
  taskId: string,
): Promise<GenerateMetadataMetricsResponse> {
  const { data } = await apiClient.post<GenerateMetadataMetricsResponse>(
    "/api/metrics/metadata",
    { taskId },
  );
  return data;
}

export async function generateBatchMetrics(
  taskId: string,
): Promise<GenerateBatchMetricsResponse> {
  const { data } = await apiClient.post<GenerateBatchMetricsResponse>(
    "/api/metrics/batches",
    { taskId },
  );
  return data;
}

export interface RunValEvalResponse {
  success: boolean;
  filename?: string;
  predictionsFilename?: string;
  macroF1?: number;
  accuracy?: number;
  evalResults?: EvalResults;
  message?: string;
}

export async function runValEvaluation(taskId: string, codebook?: string[]): Promise<RunValEvalResponse> {
  const { data } = await apiClient.post<RunValEvalResponse>(
    "/api/metrics/val-eval",
    { taskId, codebook },
    { timeout: 3_600_000 },
  );
  return data;
}

export interface ValEvalProgressResponse {
  completed: number;
  total: number;
  done: boolean;
}

export async function cancelValEval(taskId: string): Promise<void> {
  await apiClient.post("/api/metrics/val-eval/cancel", { taskId }, { timeout: 5_000 });
}

export async function getValEvalProgress(taskId: string): Promise<ValEvalProgressResponse> {
  const { data } = await apiClient.get<ValEvalProgressResponse>(
    `/api/metrics/val-eval/progress/${taskId}`,
    { timeout: 5_000 },
  );
  return data;
}

export async function downloadMetricsFile(filename: string): Promise<Blob> {
  const response = await apiClient.get(`/api/metrics/download/${filename}`, {
    responseType: "blob",
  });
  return response.data as Blob;
}
