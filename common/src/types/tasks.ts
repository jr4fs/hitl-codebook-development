export interface LabelItem {
  name: string;
  definition: string;
  keywords: string[];
  guidelines?: string;
}

export interface EvalResults {
  predictionsFilename: string;
  macroF1: number;
  accuracy: number;
  numSamples: number;
  completedAt: string;
}

export interface Task {
  _id?: string; // MongoDB ObjectId as string
  name: string;
  description: string;
  type: "Multiclass" | "Single-class";
  labels: LabelItem[];
  labelColumn: string;
  modelName: string;
  status?: "sampling_pending" | "ready" | "sampling_error" | "auto_labeling" | "auto_label_complete";
  codebook?: string[];
  codebookSourceTaskId?: string;
  codebookSourceTaskName?: string;
  taskJsonRaw?: string;
  labelsJsonRaw?: string;
  userID: string;
  columns: string[];
  file: string; // filename stored in /backend/uploads
  outputFile?: string; // server path of the auto-labeled output CSV
  inputFileName?: string; // original CSV filename from the user's disk
  restFile?: string;
  valFile?: string;
  evalResults?: EvalResults;
  createdAt: string; // ISO 8601 timestamp
  updatedAt?: string; // ISO 8601 timestamp
}

export interface CreateTaskRequest {
  name: string;
  description: string;
  type: "Multiclass" | "Single-class";
  labels: LabelItem[];
  codebook?: string[];
  codebookSourceTaskId?: string;
  codebookSourceTaskName?: string;
  columns: string[];
  file: string; // filename from upload endpoint
  restFile?: string;
  valFile?: string;
  userID: string;
  status?: "sampling_pending" | "ready" | "sampling_error" | "auto_labeling" | "auto_label_complete";
}

export interface UpdateTaskRequest {
  taskId: string;
  name?: string;
  description?: string;
  type?: "Multiclass" | "Single-class";
  labels?: LabelItem[];
  codebook?: string[];
  codebookSourceTaskId?: string;
  codebookSourceTaskName?: string;
  columns?: string[];
}

export interface CreateTaskResponse {
  success: boolean;
  message?: string;
  taskId?: string;
  task?: Task;
  errors?: Record<string, string[]>;
}

export interface UpdateTaskResponse {
  success: boolean;
  message?: string;
  task?: Task;
  errors?: Record<string, string[]>;
}

export interface TaskQueryResponse {
  success: boolean;
  message?: string;
  tasks?: Task[];
  count?: number;
  error?: string;
}

export interface UploadFileResponse {
  success: boolean;
  message?: string;
  filePath?: string; // The saved filename with timestamp
  errors?: Record<string, string[]>;
}

export interface CreateAutoLabelTaskRequest {
  name: string;
  description: string;
  type: "Multiclass" | "Single-class";
  labels: LabelItem[];
  codebook: string[];
  columns: string[];
  file: string; // server path of the uploaded input CSV
  outputFile: string; // server path of the labeled output CSV
  inputFileName: string; // original CSV filename from the user's disk
  modelName: string;
  labelColumn: string;
  taskJsonRaw: string;
  labelsJsonRaw: string;
  userID: string;
}

export interface CreateAutoLabelTaskResponse {
  success: boolean;
  message?: string;
  taskId?: string;
}

export interface StartAutoLabelJobRequest {
  name: string;
  description: string;
  type: "Multiclass" | "Single-class";
  labels: LabelItem[];
  codebook: string[];
  inputFileName: string;
  filePath: string;         // server-side filename in shared_uploads/
  modelName: string;
  taskJsonRaw: string;
  labelsJsonRaw: string;
  textColumn: string;
}

export interface StartAutoLabelJobResponse {
  success: boolean;
  message?: string;
  taskId?: string;
}

export interface AutoLabelProgressResponse {
  completed: number;
  total: number;
  done: boolean;
  rows?: Array<Record<string, string>>;
  error?: string;
}
