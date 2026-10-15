import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createSpace,
  getSpaces,
} from "../controllers/space.controller.js";

const router = Router();

router.get("/", requireAuth, getSpaces);
router.post("/", requireAuth, createSpace);

export default router;