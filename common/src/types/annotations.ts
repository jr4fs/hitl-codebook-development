export interface AnnotationItem {
  _id?: string;
  taskId: string;
  sampleId: number;
  sampleContent: Record<string, string>;
  labels: string[];
  aiAnnotation?: AIAssisted;
  createdBy: string; //userId
  createdAt: string; //ISO string
}

export interface AIAssisted {
  batchID?: string | null;
  batchNum?: number | null;
  label: string[];
  reason: string;
  span_text: string;
  predictionRaw?: string | null;
  isCorrect: boolean | null;
  feedback: string;
  timeToCompleteMs?: number | null;
  batchDurationMs?: number | null;
  codebookSnapshot?: string[];
  codebookSnapshotSample?: string[];
  codebookSnapshotBatch?: string[];
}

export interface AddAnnotationRequest {
  taskId: string;
  sampleId: number;
  annotationSampleRow: Record<string, string>;
  labels: string[];
}

export interface AddAnnotationResponse {
  success: boolean;
  message: string;
  annotationId: string;
}

export interface UpdateAnnotationRequest {
  annotationId: string;
  labels?: string[];
  aiAnnotation?: AIAssisted;
}

export interface UpdateAnnotationResponse {
  success: boolean;
  message: string;
}

export interface GetTaskAnnotationsResponse {
  success: boolean;
  taskId?: string;
  annotations?: AnnotationItem[];
  message?: string;
}
