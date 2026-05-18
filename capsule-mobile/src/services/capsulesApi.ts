import axios from 'axios';

import { API_URL } from '@/config/api';

export type Capsule = {
  id: string;
  title: string;
  revealAt: string;
  imageUrl?: string | null;
  ownerId?: string;
  isRevealed?: boolean;
  createdAt?: string;
};

export type CreateCapsulePayload = {
  title: string;
  revealAt: string;
  image?: {
    uri: string;
    name: string;
    type: string;
    file?: Blob;
  } | null;
};

type CapsulesResponse = {
  success: boolean;
  count: number;
  data: Capsule[];
};

type CapsuleResponse = {
  success: boolean;
  message?: string;
  data: Capsule;
};

const capsulesClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export async function getCapsules(token: string) {
  const response = await capsulesClient.get<CapsulesResponse>('/capsules', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.data;
}

export async function createCapsule(token: string, payload: CreateCapsulePayload) {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('revealAt', payload.revealAt);

  if (payload.image) {
    formData.append('image', payload.image.file ?? (payload.image as unknown as Blob));
  }

  const response = await capsulesClient.post<CapsuleResponse>('/capsules', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export function getCapsulesErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Your session has expired. Please log in again.';
    }

    const responseData = error.response?.data as { error?: string; message?: string } | undefined;
    return responseData?.error ?? responseData?.message ?? error.message;
  }

  return error instanceof Error ? error.message : 'Unable to load capsules.';
}
