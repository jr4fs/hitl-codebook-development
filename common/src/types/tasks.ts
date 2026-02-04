export interface LabelItem {
  name: string;
  definition: string;
  keywords: string[];
}

export interface Task {
  _id?: string; // MongoDB ObjectId as string
  name: string;
  description: string;
  type: "Multiclass" | "Single-class";
  labels: LabelItem[];
  userID: string;
  columns: string[];
  file: string; // filename stored in /backend/uploads
  createdAt: string; // ISO 8601 timestamp
  updatedAt?: string; // ISO 8601 timestamp
}

export interface CreateTaskRequest {
  name: string;
  description: string;
  type: "Multiclass" | "Single-class";
  labels: LabelItem[];
  columns: string[];
  file: string; // filename from upload endpoint
  userID: string;
}

export interface CreateTaskResponse {
  success: boolean;
  message?: string;
  taskId?: string;
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