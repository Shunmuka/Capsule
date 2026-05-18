/// <reference path="../types/express.d.ts" />

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Access denied. No token provided.",
    });
    return;
  }

  const token = authorizationHeader.slice("Bearer ".length);

  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (typeof decoded !== "object" || decoded === null) {
      throw new Error("Invalid token payload.");
    }

    const payload = decoded as Record<string, unknown>;

    if (typeof payload.id !== "string" || typeof payload.email !== "string") {
      throw new Error("Invalid token payload.");
    }

    req.user = {
      id: payload.id,
      email: payload.email,
    };

    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: "Invalid or expired token.",
    });
  }
};
