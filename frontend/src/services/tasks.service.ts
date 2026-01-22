import { CreateTaskRequest, CreateTaskResponse, TaskQueryResponse, UploadFileResponse } from "@common/types/tasks";
import { apiClient } from "../lib/apiClient";

export async function createTask(
    payload: CreateTaskRequest
): Promise<CreateTaskResponse> {
    const { data } = await apiClient.post<CreateTaskResponse>(
        "/api/tasks/createTask",
        payload
    );
    return data;
}

export async function getUserTasks(
): Promise<TaskQueryResponse> {
    const { data } = await apiClient.get<TaskQueryResponse>(`/api/tasks/getTasks`);
    return data;
}

export async function uploadFile(file: File): Promise<UploadFileResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post<UploadFileResponse>("/api/tasks/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    console.log(data);
    return data;
}



