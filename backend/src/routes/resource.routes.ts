import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  listResourcesController,
  getResourceByIdController,
  renameResourceController,
  createResourceDownloadUrlController,
  trashResourceController,
  restoreResourceController,
  permanentlyDeleteResourceController,
  attachResourceController,
  listResourceAttachmentsController,
  detachResourceController,
  createResourceUploadIntentController,
  completeResourceUploadController,
  listTargetAttachmentsController,
} from "../controllers/resource.controller.js";

const router = Router();

router.get("/", requireAuth, listResourcesController);
router.get(
  "/target/:targetType/:targetId/attachments",
  requireAuth,
  listTargetAttachmentsController,
);
router.get("/:resourceId", requireAuth, getResourceByIdController);
router.get(
  "/:resourceId/attachments",
  requireAuth,
  listResourceAttachmentsController,
);
router.patch("/:resourceId", requireAuth, renameResourceController);
router.post(
  "/upload-intent",
  requireAuth,
  createResourceUploadIntentController,
);
router.post(
  "/:resourceId/complete",
  requireAuth,
  completeResourceUploadController,
);
router.post(
  "/:resourceId/download-url",
  requireAuth,
  createResourceDownloadUrlController,
);
router.post(
  "/:resourceId/restore",
  requireAuth,
  restoreResourceController,
);
router.post(
  "/:resourceId/attachments",
  requireAuth,
  attachResourceController,
);
router.delete(
  "/:resourceId",
  requireAuth,
  trashResourceController,
);
router.delete(
  "/:resourceId/permanent",
  requireAuth,
  permanentlyDeleteResourceController,
);
router.delete(
  "/:resourceId/attachments/:attachmentId",
  requireAuth,
  detachResourceController,
);

export default router;