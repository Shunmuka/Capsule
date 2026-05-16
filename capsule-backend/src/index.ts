import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma, PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

type AuthenticatedUser = {
  id: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

app.use(cors());
app.use(express.json());

const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
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

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Capsule API is running",
  });
});

app.post("/api/v1/users", async (req: Request, res: Response) => {
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
});

app.post("/api/v1/login", async (req: Request, res: Response) => {
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
});

app.get("/api/v1/users/me", verifyToken, async (req: Request, res: Response) => {
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
});

app.listen(port, () => {
  console.log(`Capsule API server is running on port ${port}`);
});
