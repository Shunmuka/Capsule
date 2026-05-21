import { Router } from "express";
import {
  getVerifiedFriends,
  respondToFriendRequest,
  sendFriendRequest,
} from "../controllers/friendshipController.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyToken);
router.post("/friend-requests", sendFriendRequest);
router.patch("/friend-requests/:id", respondToFriendRequest);
router.get("/friends", getVerifiedFriends);

export default router;
