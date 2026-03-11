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

export async function downloadMetricsFile(filename: string): Promise<Blob> {
  const response = await apiClient.get(`/api/metrics/download/${filename}`, {
    responseType: "blob",
  });
  return response.data as Blob;
}
