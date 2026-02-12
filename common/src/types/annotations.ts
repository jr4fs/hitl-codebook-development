export interface AnnotationItem {
    _id?: string;
    taskId: string;
    sampleId: number;
    sampleContent: Record<string, string>;
    labels: string[];
    createdBy: string; //userId
    createdAt: string; //ISO string
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
    labels: string[];
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