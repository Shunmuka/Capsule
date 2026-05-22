/// <reference path="../types/express.d.ts" />

import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { prisma } from "../lib/prisma.js";
import type { ValidatedCapsuleDateEdit } from "../middleware/capsuleValidation.js";

type CapsuleDateEditBody = {
  newRevealAt: string;
  validatedCapsule?: ValidatedCapsuleDateEdit;
};

type InviteMemberBody = {
  invitedUserId?: string;
};

type UploadedFiles = Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined;

const uploadCapsuleImage = async (userId: string, file: Express.Multer.File, capsuleId?: string) => {
  const fileExtension = extname(file.originalname).toLowerCase();
  const uniqueFileName = capsuleId
    ? `${userId}/${capsuleId}/${randomUUID()}${fileExtension}`
    : `${userId}/${randomUUID()}${fileExtension}`;

  const { error } = await supabase.storage
    .from("capsule-storage")
    .upload(uniqueFileName, file.buffer, {
      contentType: file.mimetype,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data: publicUrlData } = supabase.storage.from("capsule-storage").getPublicUrl(uniqueFileName);
  return publicUrlData.publicUrl;
};

const getUploadedFiles = (files: UploadedFiles, fieldName: string) => {
  if (!files) {
    return [];
  }

  if (Array.isArray(files)) {
    return fieldName === "images" ? files : [];
  }

  return files[fieldName] ?? [];
};

export const createCapsule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, revealAt } = req.body;
    const userId = req.user!.id;
    const imageUrls: string[] = [];
    const files = getUploadedFiles(req.files, "images");
    const coverFile = getUploadedFiles(req.files, "cover")[0];
    const coverImageUrl = coverFile ? await uploadCapsuleImage(userId, coverFile) : null;

    for (const file of files) {
      imageUrls.push(await uploadCapsuleImage(userId, file));
    }

    const newCapsule = await prisma.capsule.create({
      data: {
        title,
        revealAt: new Date(revealAt),
        coverImageUrl,
        imageUrls,
        ownerId: userId,
      },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Capsule sealed successfully!",
      data: newCapsule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create capsule.",
    });
  }
};

export const updateCapsuleImages = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      res.status(400).json({
        success: false,
        error: "At least one image is required.",
      });
      return;
    }

    const capsule = await prisma.capsule.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!capsule) {
      res.status(404).json({
        success: false,
        error: "Capsule not found",
      });
      return;
    }

    const newImageUrls: string[] = [];

    for (const file of files) {
      newImageUrls.push(await uploadCapsuleImage(userId, file, id));
    }

    const updatedCapsule = await prisma.capsule.update({
      where: {
        id: capsule.id,
      },
      data: {
        imageUrls: [...capsule.imageUrls, ...newImageUrls],
      },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Images added successfully!",
      data: updatedCapsule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to add capsule images.",
    });
  }
};

export const updateCapsuleCoverImage = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "A cover image is required.",
      });
      return;
    }

    const capsule = await prisma.capsule.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!capsule) {
      res.status(404).json({
        success: false,
        error: "Capsule not found",
      });
      return;
    }

    const coverImageUrl = await uploadCapsuleImage(userId, req.file, id);
    const updatedCapsule = await prisma.capsule.update({
      where: {
        id: capsule.id,
      },
      data: {
        coverImageUrl,
      },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Cover image updated successfully.",
      data: updatedCapsule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update cover image.",
    });
  }
};

export const inviteMemberToCapsule = async (
  req: Request<{ id: string }, unknown, InviteMemberBody>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { invitedUserId } = req.body;
    const userId = req.user!.id;

    if (!invitedUserId) {
      res.status(400).json({
        success: false,
        error: "invitedUserId is required.",
      });
      return;
    }

    const capsule = await prisma.capsule.findFirst({
      where: {
        id,
        ownerId: userId,
      },
      include: {
        members: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!capsule) {
      res.status(404).json({
        success: false,
        error: "Capsule not found",
      });
      return;
    }

    if (capsule.members.some((member) => member.id === invitedUserId)) {
      res.status(400).json({
        success: false,
        error: "This user is already a capsule member.",
      });
      return;
    }

    const updatedCapsule = await prisma.capsule.update({
      where: {
        id: capsule.id,
      },
      data: {
        members: {
          connect: {
            id: invitedUserId,
          },
        },
      },
      include: {
        members: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Member invited to capsule successfully.",
      data: updatedCapsule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to invite member to capsule.",
    });
  }
};

export const getCapsules = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const capsules = await prisma.capsule.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: capsules.length,
      data: capsules,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch capsules.",
    });
  }
};

export const getCapsuleDetails = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const capsule = await prisma.capsule.findUnique({
      where: {
        id,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        members: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        photos: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            uploader: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    if (!capsule) {
      res.status(404).json({
        success: false,
        error: "Capsule not found",
      });
      return;
    }

    const isMember = capsule.members.some((member) => member.id === userId);
    if (capsule.ownerId !== userId && !isMember) {
      res.status(404).json({
        success: false,
        error: "Capsule not found",
      });
      return;
    }

    const isRevealed = new Date().getTime() >= capsule.revealAt.getTime();
    const photoUrls = new Set(capsule.photos.map((photo) => photo.s3_url));
    const relationPhotos = capsule.photos.map((photo) => ({
      id: photo.id,
      capsuleId: photo.capsuleId,
      uploaderId: photo.uploaderId,
      uploadedAt: photo.createdAt,
      uploader: photo.uploader,
      imageUrl: isRevealed ? photo.s3_url : null,
      s3_url: isRevealed ? photo.s3_url : null,
    }));
    const imageUrlPhotos = capsule.imageUrls
      .filter((imageUrl) => !photoUrls.has(imageUrl))
      .map((imageUrl, index) => ({
        id: `${capsule.id}-image-${index}`,
        capsuleId: capsule.id,
        uploaderId: capsule.ownerId,
        uploadedAt: capsule.createdAt,
        uploader: capsule.owner,
        imageUrl: isRevealed ? imageUrl : null,
        s3_url: isRevealed ? imageUrl : null,
      }));
    const photos = [...relationPhotos, ...imageUrlPhotos];

    res.status(200).json({
      success: true,
      data: {
        id: capsule.id,
        title: capsule.title,
        revealAt: capsule.revealAt,
        imageUrls: capsule.imageUrls,
        coverImageUrl: capsule.coverImageUrl ?? capsule.imageUrls[0] ?? null,
        ownerId: capsule.ownerId,
        members: capsule.members,
        isRevealed,
        photoCount: photos.length,
        photos,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch capsule details.",
    });
  }
};

export const updateCapsuleRevealDate = async (
  req: Request<{ id: string }, unknown, CapsuleDateEditBody>,
  res: Response,
): Promise<void> => {
  try {
    const { newRevealAt, validatedCapsule } = req.body;

    if (!validatedCapsule) {
      res.status(500).json({
        success: false,
        error: "Validated capsule data was not provided.",
      });
      return;
    }

    const updatedCapsule = await prisma.capsule.update({
      where: {
        id: validatedCapsule.id,
      },
      data: {
        revealAt: new Date(newRevealAt),
      },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Reveal date updated successfully.",
      data: updatedCapsule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update reveal date.",
    });
  }
};
