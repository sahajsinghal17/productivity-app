
import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createTaskController,
  listTasksController,
  updateTaskController,
  deleteTaskController,
  listDeletedTasksController,
  restoreTaskController,
  permanentlyDeleteTaskController,
} from "../controllers/task.controller.js";

const router = Router();

router.post("/", requireAuth, createTaskController);
router.get("/", requireAuth, listTasksController);
router.patch("/:taskId", requireAuth, updateTaskController);
router.delete("/:taskId", requireAuth, deleteTaskController);
router.get("/trash", requireAuth, listDeletedTasksController);
router.patch("/:taskId/restore", requireAuth, restoreTaskController);
router.delete(
  "/:taskId/permanent",
  requireAuth,
  permanentlyDeleteTaskController,
);

export default router;
