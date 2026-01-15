import { User, CreateUserRequest, CreateUserResponse, LoginUserRequest, LoginUserResponse } from "@common/types/accounts";
import { apiClient } from "../lib/apiClient";

export async function createUser(
  payload: CreateUserRequest
): Promise<CreateUserResponse> {
  const { data } = await apiClient.post<CreateUserResponse>(
    "/api/account/signup",
    payload
  );
  return data;
}

export async function loginUser(
  payload: LoginUserRequest
): Promise<LoginUserResponse> {
  const { data } = await apiClient.post<LoginUserResponse>(
    "/api/account/login",
    payload
  );
  return data;
}
