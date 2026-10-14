import { Router } from "express";
import {
  loginController,
  signupController,
} from "../controllers/auth.controller.js";
import { getCurrentUser } from "../controllers/me.controller.js";
import { logoutController } from "../controllers/logout.controller.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

router.post("/signup", signupController);
router.post("/login", loginController);
router.get("/me", getCurrentUser);
router.post("/logout", logoutController);

export default router;