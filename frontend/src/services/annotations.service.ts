import { AnnotationItem, AddAnnotationRequest, AddAnnotationResponse, GetTaskAnnotationsResponse, UpdateAnnotationRequest, UpdateAnnotationResponse } from "@common/types/annotations";
import { apiClient } from "../lib/apiClient";

export async function addAnnotation(
    payload: AddAnnotationRequest
): Promise<AddAnnotationResponse> {
    const { data } = await apiClient.post<AddAnnotationResponse>(
        "/api/annotate/add",
        payload
    );
    return data;
}

export async function updateAnnotation(
    payload: UpdateAnnotationRequest
): Promise<UpdateAnnotationResponse> {
    const { data } = await apiClient.put<UpdateAnnotationResponse>(
        "/api/annotate/update",
        payload
    );
    return data;
}

export async function getTaskAnnotations(taskId: string): Promise<GetTaskAnnotationsResponse> {
    const { data } = await apiClient.get<GetTaskAnnotationsResponse>(`/api/annotate/get-annotations/${taskId}`);
    return data;
}
