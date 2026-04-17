import { LabelItem } from "./tasks";

export interface EmbedDatasetRequest {
  file_path: string;
  text_col: string[];
  id_col?: string;
  split_to_sentences?: boolean;
  model_name?: string;
  device?: string;
  labels: LabelItem[];
  taskId: string;
  userId: string;
  label_col: string;
  coverage_n?: number;
}

export interface EmbedDatasetResponse {
  success: boolean;
  val_created: boolean;
  rest_created: boolean;
  file_name: string;
  val_data: Record<string, any>[];
}

