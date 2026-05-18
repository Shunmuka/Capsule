import { Router } from "express";
import { createCapsule, getCapsuleById, getCapsules } from "../controllers/capsule.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.get("/", verifyToken, getCapsules);
router.get("/:id", verifyToken, getCapsuleById);
router.post("/", verifyToken, upload.single("image"), createCapsule);

export default router;
