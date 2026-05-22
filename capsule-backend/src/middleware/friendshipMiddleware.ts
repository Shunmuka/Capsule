import { FriendshipStatus } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

type FriendshipGateBody = {
  invitedUserId?: unknown;
  friendId?: unknown;
  userId?: unknown;
};

const getAuthenticatedUserId = (req: Request): string | undefined => {
  const body = req.body as FriendshipGateBody;

  if (req.user?.id) {
    return req.user.id;
  }

  return typeof body.userId === "string" ? body.userId : undefined;
};

const getTargetFriendId = (req: Request): string | undefined => {
  const body = req.body as FriendshipGateBody;
  const params = req.params as { friendId?: string };

  if (typeof body.invitedUserId === "string") {
    return body.invitedUserId;
  }

  if (typeof body.friendId === "string") {
    return body.friendId;
  }

  return params.friendId;
};

export const requireAcceptedFriendship = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const targetFriendId = getTargetFriendId(req);

    if (!currentUserId) {
      res.status(401).json({
        success: false,
        error: "Authentication is required.",
      });
      return;
    }

    if (!targetFriendId) {
      res.status(400).json({
        success: false,
        error: "A target friend ID is required.",
      });
      return;
    }

    const acceptedFriendship = await prisma.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          {
            senderId: currentUserId,
            receiverId: targetFriendId,
          },
          {
            senderId: targetFriendId,
            receiverId: currentUserId,
          },
        ],
      },
    });

    if (!acceptedFriendship) {
      res.status(403).json({
        success: false,
        error: "You must be accepted friends before performing this action.",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Failed to verify accepted friendship:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
