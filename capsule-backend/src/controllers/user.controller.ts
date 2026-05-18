/// <reference path="../types/express.d.ts" />

import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  const userProfile = await prisma.user.findUnique({
    where: {
      id: req.user!.id,
    },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
    },
  });

  res.status(200).json({
    success: true,
    data: userProfile,
  });
};
