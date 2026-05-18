import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password_hash: hashedPassword,
      },
    });

    res.status(201).json({
      success: true,
      message: "User created successfully!",
      data: newUser,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(400).json({
        success: false,
        error: "Username or email is already taken.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to create user.",
    });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials.",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials.",
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      jwtSecret,
      {
        expiresIn: "7d",
      },
    );

    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to log in.",
    });
  }
};
