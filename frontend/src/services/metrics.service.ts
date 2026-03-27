import { apiClient } from "../lib/apiClient";

export async function generateSampleMetrics(taskId: string) {
  const { data } = await apiClient.post<{
    success: boolean;
    filename?: string;
  }>("/api/metrics/samples", { taskId });
  return data;
}

export async function generateMetadataMetrics(taskId: string) {
  const { data } = await apiClient.post<{
    success: boolean;
    filename?: string;
  }>("/api/metrics/metadata", { taskId });
  return data;
}

export async function generateBatchMetrics(taskId: string) {
  const { data } = await apiClient.post<{
    success: boolean;
    filename?: string;
  }>("/api/metrics/batches", { taskId });
  return data;
}

export async function generateCodebookExport(
  taskId: string,
  codebook?: string[],
) {
  const { data } = await apiClient.post<{
    success: boolean;
    filename?: string;
  }>("/api/metrics/codebook", { taskId, codebook });
  return data;
}

export async function downloadMetricsFile(filename: string) {
  const { data } = await apiClient.get<Blob>(
    `/api/metrics/download/${filename}`,
    { responseType: "blob" },
  );
  return data;
}
