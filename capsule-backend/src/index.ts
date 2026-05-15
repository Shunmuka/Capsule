import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { Prisma, PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
  console.log(`Capsule API server is running on port ${port}`);
});
