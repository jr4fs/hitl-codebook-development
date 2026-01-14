import { CreateTaskRequest, CreateTaskResponse, TaskQueryResponse } from "@common/types/tasks";
import { apiClient } from "../lib/apiClient";

export async function createTask(
    payload: CreateTaskRequest
): Promise<CreateTaskResponse> {
    const { data } = await apiClient.post<CreateTaskResponse>(
        "/api/tasks/",
        payload
    );
    return data;
}

export async function getUserTasks(
    userId: string
): Promise<TaskQueryResponse> {
    const { data } = await apiClient.get<TaskQueryResponse>(`/api/tasks/user/${userId}`);
    return data;
}

export async function uploadFile(file: File): Promise<CreateTaskResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post<CreateTaskResponse>("/api/tasks/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return data;
}



