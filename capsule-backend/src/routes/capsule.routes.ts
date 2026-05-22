import { Router } from "express";
import {
  createCapsule,
  getCapsuleDetails,
  getCapsules,
  inviteMemberToCapsule,
  updateCapsuleCoverImage,
  updateCapsuleImages,
  updateCapsuleRevealDate,
} from "../controllers/capsule.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import { validateCapsuleDateEdit } from "../middleware/capsuleValidation.js";
import { requireAcceptedFriendship } from "../middleware/friendshipMiddleware.js";

const router = Router();

router.get("/", verifyToken, getCapsules);
router.get("/:id", verifyToken, getCapsuleDetails);
router.post("/", verifyToken, upload.fields([{ name: "cover", maxCount: 1 }, { name: "images" }]), createCapsule);
router.patch("/:id/cover", verifyToken, upload.single("cover"), updateCapsuleCoverImage);
router.patch("/:id/date", verifyToken, validateCapsuleDateEdit, updateCapsuleRevealDate);
router.patch("/:id/images", verifyToken, upload.array("images"), updateCapsuleImages);
router.post("/:id/members", verifyToken, requireAcceptedFriendship, inviteMemberToCapsule);

export default router;
