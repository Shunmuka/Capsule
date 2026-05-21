import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import friendshipRoutes from "./routes/friendshipRoutes.js";
import masterRouter from "./routes/index.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Capsule API is running",
  });
});

app.use("/api/v1", masterRouter);
app.use("/api/v1", friendshipRoutes);

app.listen(port, () => {
  console.log(`Capsule API server is running on port ${port}`);
});
