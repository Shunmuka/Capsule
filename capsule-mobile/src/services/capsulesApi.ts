import axios from 'axios';

import { API_URL } from '@/config/api';

export type Capsule = {
  id: string;
  title: string;
  revealAt: string;
  imageUrls?: string[];
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  ownerId?: string;
  isRevealed?: boolean;
  createdAt?: string;
  _count: {
    photos: number;
  };
};

export type CreateCapsulePayload = {
  title: string;
  revealAt: string;
  images?: Array<{
    uri: string;
    name: string;
    type: string;
    file?: Blob;
  }>;
};

export type CapsuleDetailPhoto = {
  id: string;
  capsuleId: string;
  uploaderId: string;
  uploadedAt: string;
  uploader?: {
    id: string;
    username: string;
    email: string;
  };
  imageUrl: string | null;
  s3_url: string | null;
};

export type CapsuleDetail = {
  id: string;
  title: string;
  revealAt: string;
  imageUrls?: string[];
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  ownerId: string;
  createdAt?: string;
  members: Array<{
    id: string;
    username: string;
    email: string;
  }>;
  isRevealed: boolean;
  photoCount: number;
  photos: CapsuleDetailPhoto[];
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

type CapsuleDetailResponse = {
  success: boolean;
  data: CapsuleDetail;
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

  return response.data.data.map((capsule) => {
    const imageUrls = capsule.imageUrls?.length ? capsule.imageUrls : capsule.imageUrl ? [capsule.imageUrl] : [];

    return {
      ...capsule,
      imageUrls,
      coverImageUrl: capsule.coverImageUrl ?? imageUrls[0] ?? null,
      _count: {
        photos: Math.max(capsule._count?.photos ?? 0, imageUrls.length),
      },
    };
  });
}

export async function getCapsuleDetails(token: string, capsuleId: string) {
  const response = await capsulesClient.get<CapsuleDetailResponse>(`/capsules/${capsuleId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const capsule = response.data.data;
  const imageUrls = capsule.imageUrls?.length ? capsule.imageUrls : capsule.imageUrl ? [capsule.imageUrl] : [];
  const isRevealed = capsule.isRevealed ?? true;
  const fallbackPhotos = imageUrls.map((imageUrl, index) => ({
    id: `${capsule.id}-image-${index}`,
    capsuleId: capsule.id,
    uploaderId: capsule.ownerId,
    uploadedAt: capsule.createdAt ?? capsule.revealAt,
    imageUrl: isRevealed ? imageUrl : null,
    s3_url: isRevealed ? imageUrl : null,
  }));
  const photos = capsule.photos?.length ? capsule.photos : fallbackPhotos;

  return {
    ...capsule,
    isRevealed,
    imageUrls,
    coverImageUrl: capsule.coverImageUrl ?? imageUrls[0] ?? null,
    photoCount: capsule.photoCount ?? photos.length,
    members: capsule.members ?? [],
    photos,
  };
}

export async function createCapsule(token: string, payload: CreateCapsulePayload) {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('revealAt', payload.revealAt);

  payload.images?.forEach((image) => {
    formData.append('images', image.file ?? (image as unknown as Blob));
  });

  const response = await capsulesClient.post<CapsuleResponse>('/capsules', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function addCapsuleImages(token: string, capsuleId: string, images: NonNullable<CreateCapsulePayload['images']>) {
  const formData = new FormData();

  images.forEach((image) => {
    formData.append('images', image.file ?? (image as unknown as Blob));
  });

  const response = await capsulesClient.patch<CapsuleResponse>(`/capsules/${capsuleId}/images`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function updateCapsuleRevealDate(token: string, capsuleId: string, newRevealAt: string) {
  const response = await capsulesClient.patch<CapsuleResponse>(
    `/capsules/${capsuleId}/date`,
    { newRevealAt },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

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
