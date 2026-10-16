
import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createGoalController,
  listGoalsController,
  updateGoalController,
  getGoalProgressController,
  deleteGoalController,
  listDeletedGoalsController,
  restoreGoalController,
  permanentlyDeleteGoalController,
} from "../controllers/goal.controller.js";

const router = Router();

router.use(requireAuth);

// Trash routes must come before /:goalId routes.
router.get("/trash", listDeletedGoalsController);

router.post("/", createGoalController);
router.get("/", listGoalsController);
router.get("/:goalId/progress", getGoalProgressController);
router.patch("/:goalId", updateGoalController);
router.delete("/:goalId", deleteGoalController);
router.post("/:goalId/restore", restoreGoalController);
router.delete(
  "/:goalId/permanent",
  permanentlyDeleteGoalController,
);

export default router;
