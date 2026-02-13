import { MLapiClient } from "../lib/MLapiClient";
import { InferenceRequest, InferenceResponse, BatchInferenceRequest, BatchInferenceSummary } from '@common/types/inference';
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
      console.error("[AI Annotation] API Error:", error.response?.data || error.message);
      throw error;
    }
    throw error;
  }
}

export async function batchInference(
  payload: BatchInferenceRequest[]
): Promise<BatchInferenceSummary> {
  try {
    const { data } = await MLapiClient.post<BatchInferenceSummary>(
      "/inference/batch-inference",
      payload
    );
    return data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error("[Batch AI Annotation] API Error:", error.response?.data || error.message);
      throw error;
    }
    throw error;
  }
}