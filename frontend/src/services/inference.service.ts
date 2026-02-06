import { MLapiClient } from "../lib/MLapiClient";
import { InferenceRequest, InferenceResponse } from '@common/types/inference';
import { AxiosError } from "axios";

export async function inference(
    payload: InferenceRequest
  ): Promise<InferenceResponse> {
    try {
      const { data } = await MLapiClient.post<InferenceResponse>(
        "/inference/",
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
