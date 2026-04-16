import { apiClient } from "../lib/apiClient";
import { EmbedDatasetRequest, EmbedDatasetResponse } from '@common/types/embedding';
import { AxiosError } from "axios";

export async function embedDataset(
  payload: EmbedDatasetRequest
): Promise<EmbedDatasetResponse> {
  try {
    const { data } = await apiClient.post<EmbedDatasetResponse>(
      "/embedding/run",
      payload
    );
    return data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error("API Error:", error.response?.data || error.message);
      throw error;
    }
    throw error;
  }
}
export async function representativeSampling(
  payload: EmbedDatasetRequest
): Promise<{ success: boolean; message: string }> {
  try {
    const { data } = await apiClient.post<{ success: boolean; message: string }>(
      "/api/embedding/representative",
      payload
    );
    return data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error("API Error:", error.response?.data || error.message);
      throw error;
    }
    throw error;
  }
}

export async function coverageSampling(
  payload: EmbedDatasetRequest
): Promise<{ success: boolean; message: string }> {
  try {
    const { data } = await apiClient.post<{ success: boolean; message: string }>(
      "/api/embedding/coverage",
      payload
    );
    return data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error("API Error:", error.response?.data || error.message);
      throw error;
    }
    throw error;
  }
}
