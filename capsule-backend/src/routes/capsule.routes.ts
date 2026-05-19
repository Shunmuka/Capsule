import { Router } from "express";
import {
  createCapsule,
  getCapsuleDetails,
  getCapsules,
  updateCapsuleImages,
  updateCapsuleRevealDate,
} from "../controllers/capsule.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import { validateCapsuleDateEdit } from "../middleware/capsuleValidation.js";

const router = Router();

router.get("/", verifyToken, getCapsules);
router.get("/:id", verifyToken, getCapsuleDetails);
router.post("/", verifyToken, upload.array("images"), createCapsule);
router.patch("/:id/date", verifyToken, validateCapsuleDateEdit, updateCapsuleRevealDate);
router.patch("/:id/images", verifyToken, upload.array("images"), updateCapsuleImages);

export default router;
