import axios from 'axios';

import { API_URL } from '@/config/api';

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = LoginPayload & {
  username: string;
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
};

export type LoginResponse = {
  success: boolean;
  message?: string;
  token?: string;
  data?: AuthUser;
};

export type SignupResponse = {
  success: boolean;
  message?: string;
  data?: AuthUser;
};

const authClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export async function loginUser(payload: LoginPayload) {
  const response = await authClient.post<LoginResponse>('/login', payload);
  return response.data;
}

export async function registerUser(payload: SignupPayload) {
  const response = await authClient.post<SignupResponse>('/users', payload);
  return response.data;
}

export function getAuthToken(response: LoginResponse) {
  if (!response.token) {
    throw new Error('Login response did not include a token.');
  }

  return response.token;
}

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { error?: string; message?: string } | undefined;
    return responseData?.error ?? responseData?.message ?? error.message;
  }

  return error instanceof Error ? error.message : 'Something went wrong.';
}
