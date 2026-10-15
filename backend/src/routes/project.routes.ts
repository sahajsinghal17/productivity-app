
import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createProjectController,
  listProjectsController,
  updateProjectController,
  deleteProjectController,
  listDeletedProjectsController,
  restoreProjectController,
  getProjectProgressController,
} from "../controllers/project.controller.js";

const router = Router();

router.get("/", requireAuth, listProjectsController);
router.get("/trash", requireAuth, listDeletedProjectsController);
router.get("/:projectId/progress", requireAuth, getProjectProgressController);
router.post("/", requireAuth, createProjectController);
router.patch("/:projectId", requireAuth, updateProjectController);
router.patch("/:projectId/restore", requireAuth, restoreProjectController);
router.delete("/:projectId", requireAuth, deleteProjectController);

export default router;
