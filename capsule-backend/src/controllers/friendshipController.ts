import { FriendshipStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

type FriendRequestBody = {
  receiverId?: string;
  userId?: string;
};

type FriendRequestResponseBody = {
  action?: string;
  userId?: string;
};

const getCurrentUserId = (req: Request): string | undefined => {
  const body = req.body as { userId?: unknown };
  return typeof body.userId === "string" ? body.userId : req.user?.id;
};

export const sendFriendRequest = async (
  req: Request<Record<string, never>, unknown, FriendRequestBody>,
  res: Response,
): Promise<void> => {
  try {
    const { receiverId } = req.body;
    const currentUserId = getCurrentUserId(req);

    if (!currentUserId) {
      res.status(401).json({
        success: false,
        error: "Authentication is required.",
      });
      return;
    }

    if (!receiverId) {
      res.status(400).json({
        success: false,
        error: "receiverId is required.",
      });
      return;
    }

    if (currentUserId === receiverId) {
      res.status(400).json({
        error: "You cannot send a friend request to yourself.",
      });
      return;
    }

    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          {
            senderId: currentUserId,
            receiverId,
          },
          {
            senderId: receiverId,
            receiverId: currentUserId,
          },
        ],
      },
    });

    if (existingFriendship) {
      res.status(400).json({
        success: false,
        error: "A friendship or pending friend request already exists between these users.",
      });
      return;
    }

    const friendRequest = await prisma.friendship.create({
      data: {
        senderId: currentUserId,
        receiverId,
        status: FriendshipStatus.PENDING,
      },
    });

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error("Failed to send friend request:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const respondToFriendRequest = async (
  req: Request<{ id: string }, unknown, FriendRequestResponseBody>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const currentUserId = getCurrentUserId(req);

    if (!currentUserId) {
      res.status(401).json({
        success: false,
        error: "Authentication is required.",
      });
      return;
    }

    if (action !== "ACCEPT" && action !== "DECLINE") {
      res.status(400).json({
        success: false,
        error: "action must be either ACCEPT or DECLINE.",
      });
      return;
    }

    const requestRecord = await prisma.friendship.findUnique({
      where: {
        id,
      },
    });

    if (!requestRecord) {
      res.status(404).json({
        success: false,
        error: "Friend request not found.",
      });
      return;
    }

    if (requestRecord.receiverId !== currentUserId) {
      res.status(403).json({
        success: false,
        error: "You are not authorized to respond to this friend request.",
      });
      return;
    }

    if (action === "DECLINE") {
      await prisma.friendship.delete({
        where: {
          id,
        },
      });

      res.status(200).json({
        success: true,
        message: "Friend request declined.",
      });
      return;
    }

    const updatedFriendship = await prisma.friendship.update({
      where: {
        id,
      },
      data: {
        status: FriendshipStatus.ACCEPTED,
      },
    });

    res.status(200).json(updatedFriendship);
  } catch (error) {
    console.error("Failed to respond to friend request:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const getVerifiedFriends = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = getCurrentUserId(req);

    if (!currentUserId) {
      res.status(401).json({
        success: false,
        error: "Authentication is required.",
      });
      return;
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          {
            senderId: currentUserId,
          },
          {
            receiverId: currentUserId,
          },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    const friends = friendships.map((friendship) =>
      friendship.senderId === currentUserId ? friendship.receiver : friendship.sender,
    );

    res.status(200).json(friends);
  } catch (error) {
    console.error("Failed to fetch verified friends:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
