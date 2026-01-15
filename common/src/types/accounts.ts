export interface User{
    id: string;
    name: string;
    username: string;
    email: string;
    createdAt?: string; //ISO String
}

export interface LoginUserRequest{
    email: string;
    password: string;
}

export interface LoginUserResponse {
    success: boolean;
    jwtToken: string;
    jwtRefreshToken: string;
    user: User;
    message?: string;
}

export interface CreateUserRequest {
    username: string;
    email: string;
    password: string;
    createdAt?: string; //ISO String
}

export interface CreateUserResponse {
    userId: string;
    success: boolean;
    jwtToken: string;
    jwtRefreshToken: string;
    user: User;
    message?: string;
}