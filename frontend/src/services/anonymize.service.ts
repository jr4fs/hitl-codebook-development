import { apiClient } from "../lib/apiClient";
import {
  AnonymizeConfigResponse,
  UpdateAnonymizeConfigRequest,
} from "@common/types/anonymize";

/**
 * Fetches the current anonymization config from the server
 */
export async function getAnonymizeConfig(): Promise<AnonymizeConfigResponse> {
  const { data } = await apiClient.get<AnonymizeConfigResponse>(
    "/api/anonymize/config",
  );
  return data;
}

/**
 * Updates the anonymization config
 */
export async function updateAnonymizeConfig(
  config: UpdateAnonymizeConfigRequest,
): Promise<AnonymizeConfigResponse> {
  const { data } = await apiClient.put<AnonymizeConfigResponse>(
    "/api/anonymize/config",
    config,
  );
  return data;
}

/**
 * Downloads the current names file and returns blob + filename
 */
export async function downloadNamesFile(): Promise<{
  blob: Blob;
  filename: string;
}> {
  const response = await apiClient.get("/api/anonymize/names", {
    responseType: "blob",
  });
  const headerName = response.headers?.["x-filename"];
  const disposition = response.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = headerName || match?.[1] || "names.csv";
  return { blob: response.data, filename };
}

/**
 * Uploads a new names.csv file
 */
export async function uploadNamesFile(
  file: File,
): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post("/api/anonymize/names", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}
