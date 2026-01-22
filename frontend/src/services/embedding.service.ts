import { MLapiClient } from "../lib/MLapiClient";
import { EmbedDatasetRequest, EmbedDatasetResponse } from '@common/types/embedding';
import { AxiosError } from "axios";

export async function embedDataset(
    payload: EmbedDatasetRequest
  ): Promise<EmbedDatasetResponse> {
    try {
      const { data } = await MLapiClient.post<EmbedDatasetResponse>(
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
