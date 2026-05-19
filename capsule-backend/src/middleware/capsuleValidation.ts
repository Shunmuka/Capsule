import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

export type ValidatedCapsuleDateEdit = {
  id: string;
  title: string;
  revealAt: Date;
  imageUrls: string[];
  ownerId: string;
  isRevealed: boolean;
  createdAt: Date;
  _count: {
    photos: number;
  };
};

type CapsuleDateEditBody = {
  newRevealAt?: unknown;
  validatedCapsule?: ValidatedCapsuleDateEdit;
};

export const validateCapsuleDateEdit = async (
  req: Request<{ id: string }, unknown, CapsuleDateEditBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { newRevealAt } = req.body;

    if (typeof newRevealAt !== "string") {
      res.status(400).json({
        success: false,
        error: "newRevealAt must be a valid ISO-8601 UTC timestamp.",
      });
      return;
    }

    const nextRevealAt = new Date(newRevealAt);
    if (!Number.isFinite(nextRevealAt.getTime()) || nextRevealAt.getTime() <= Date.now()) {
      res.status(400).json({
        success: false,
        error: "newRevealAt must be a valid future timestamp.",
      });
      return;
    }

    const capsule = await prisma.capsule.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        title: true,
        revealAt: true,
        imageUrls: true,
        ownerId: true,
        isRevealed: true,
        createdAt: true,
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    if (!capsule || capsule.ownerId !== req.user?.id) {
      res.status(404).json({
        success: false,
        error: "Capsule not found",
      });
      return;
    }

    const uploadedMediaCount = capsule._count.photos + capsule.imageUrls.length;

    if (uploadedMediaCount > 0 && nextRevealAt.getTime() < capsule.revealAt.getTime()) {
      res.status(400).json({
        success: false,
        error: "This capsule already has uploaded photos, so the reveal date can only be extended.",
      });
      return;
    }

    req.body.validatedCapsule = capsule;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate capsule reveal date.",
    });
  }
};
