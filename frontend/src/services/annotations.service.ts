import { AddAnnotationRequest, AddAnnotationResponse, GetTaskAnnotationsResponse, UpdateValAnnotationRequest, UpdateValAnnotationResponse, UpdateGuideAnnotationRequest, UpdateGuideAnnotationResponse } from "@common/types/annotations";
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

export async function updateValAnnotation(
    payload: UpdateValAnnotationRequest
): Promise<UpdateValAnnotationResponse> {
    const { data } = await apiClient.put<UpdateValAnnotationResponse>(
        "/api/annotate/update-val",
        payload
    );
    return data;
}

export async function updateGuideAnnotation(
    payload: UpdateGuideAnnotationRequest
): Promise<UpdateGuideAnnotationResponse> {
    const { data } = await apiClient.post<UpdateGuideAnnotationResponse>(
        "/api/annotate/update-guide",
        payload
    );
    return data;
}

export async function getTaskAnnotations(taskId: string): Promise<GetTaskAnnotationsResponse> {
    const { data } = await apiClient.get<GetTaskAnnotationsResponse>(`/api/annotate/get-annotations/${taskId}`);
    return data;
}
