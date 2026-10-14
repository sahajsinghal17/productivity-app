
import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { getSpaces } from "../controllers/space.controller.js";

const router = Router();

router.get("/", requireAuth, getSpaces);

export default router;
