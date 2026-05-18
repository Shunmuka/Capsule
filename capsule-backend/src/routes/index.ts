import { Router } from "express";
import { loginUser, registerUser } from "../controllers/auth.controller.js";
import { getUserProfile } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import capsuleRoutes from "./capsule.routes.js";

const router = Router();

router.post("/users", registerUser);
router.post("/login", loginUser);
router.get("/users/me", verifyToken, getUserProfile);
router.use("/capsules", capsuleRoutes);

export default router;
