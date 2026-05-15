import express from "express";
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Capsule API is running",
  });
});

app.listen(port, () => {
  console.log(`Capsule API server is running on port ${port}`);
});

