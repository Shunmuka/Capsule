/// <reference path="../types/express.d.ts" />

import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { prisma } from "../lib/prisma.js";

export const createCapsule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, revealAt } = req.body;
    const userId = req.user!.id;
    let imageUrl: string | null = null;

    if (req.file) {
      const fileExtension = extname(req.file.originalname).toLowerCase();
      const uniqueFileName = `${userId}/${randomUUID()}${fileExtension}`;
      const { error } = await supabase.storage
        .from("capsule-storage")
        .upload(uniqueFileName, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("capsule-storage").getPublicUrl(uniqueFileName);
      imageUrl = publicUrlData.publicUrl;
    }

    const newCapsule = await prisma.capsule.create({
      data: {
        title,
        revealAt: new Date(revealAt),
        imageUrl,
        ownerId: userId,
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

export const getCapsuleById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

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

    if (capsule.revealAt && capsule.revealAt > new Date()) {
      res.status(403).json({
        success: false,
        message: "This capsule is still sealed!",
        data: {
          id: capsule.id,
          title: capsule.title,
          unlockDate: capsule.revealAt,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: capsule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch capsule.",
    });
  }
};
