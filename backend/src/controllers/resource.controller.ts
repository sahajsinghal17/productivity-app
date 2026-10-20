import type { Request, Response } from "express";
import {
  listResources,
  getResourceById,
  renameResource,
  createResourceDownloadUrl,
  trashResource,
  restoreResource,
  permanentlyDeleteResource,
  attachResource,
  listResourceAttachments,
  detachResource,
  createResourceUploadIntent,
  completeResourceUpload,
  listTargetAttachments,
} from "../services/resource.service.js";

export async function listResourcesController(
  req: Request,
  res: Response,
): Promise<void> {
  const ownerId = req.session.userId;

  if (!ownerId) {
    res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
    return;
  }

  try {
    const parseOptionalInteger = (
      value: unknown,
      field: string,
    ): number | undefined => {
      if (value === undefined) return undefined;

      if (typeof value !== "string" || !/^\d+$/.test(value)) {
        throw new Error(`Invalid ${field}.`);
      }

      const parsed = Number(value);

      if (!Number.isSafeInteger(parsed)) {
        throw new Error(`Invalid ${field}.`);
      }

      return parsed;
    };

    for (const field of ["spaceId", "status"] as const) {
      const value = req.query[field];

      if (value !== undefined && typeof value !== "string") {
        throw new Error(`Invalid ${field}.`);
      }
    }

    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : undefined;

    if (
      status !== undefined &&
      !["available", "trashed"].includes(status)
    ) {
      throw new Error("Invalid status.");
    }

    const result = await listResources(ownerId, {
      spaceId:
        typeof req.query.spaceId === "string"
          ? req.query.spaceId
          : undefined,
      status: status as "available" | "trashed" | undefined,
      page: parseOptionalInteger(req.query.page, "page"),
      limit: parseOptionalInteger(req.query.limit, "limit"),
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to list resources.";

    const isClientError =
      message.startsWith("Invalid ") ||
      message.includes("not found") ||
      message.includes("access denied");

    res.status(isClientError ? 400 : 500).json({
      status: "error",
      message: isClientError ? message : "Unable to list resources.",
    });
  }
}

export async function getResourceByIdController(
  req: Request,
  res: Response,
): Promise<void> {
  const ownerId = req.session.userId;

  if (!ownerId) {
    res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
    return;
  }

  try {
    const resource = await getResourceById(
      ownerId,
      req.params.resourceId as string,
    );

    res.status(200).json({
      status: "success",
      data: { resource },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to retrieve resource.";

    if (message === "Invalid user ID." || message === "Invalid resource ID.") {
      res.status(400).json({ status: "error", message });
      return;
    }

    if (message === "Resource not found or access denied.") {
      res.status(404).json({ status: "error", message });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Unable to retrieve resource.",
    });
  }
}

export async function renameResourceController(
  req: Request,
  res: Response,
): Promise<void> {
  const ownerId = req.session.userId;

  if (!ownerId) {
    res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
    return;
  }

  try {
    const resource = await renameResource(
      ownerId,
      req.params.resourceId as string,
      req.body?.displayName,
    );

    res.status(200).json({
      status: "success",
      data: { resource },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to rename resource.";

    if (
      message === "Invalid user ID." ||
      message === "Invalid resource ID." ||
      message === "Display name is required." ||
      message === "Display name cannot exceed 200 characters."
    ) {
      res.status(400).json({ status: "error", message });
      return;
    }

    if (message === "Resource not found or access denied.") {
      res.status(404).json({ status: "error", message });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Unable to rename resource.",
    });
  }
}

export async function createResourceDownloadUrlController(
  req: Request,
  res: Response,
): Promise<void> {
  const ownerId = req.session.userId;

  if (!ownerId) {
    res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
    return;
  }

  try {
    const result = await createResourceDownloadUrl(
      ownerId,
      req.params.resourceId as string,
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create download URL.";

    if (
      message === "Invalid user ID." ||
      message === "Invalid resource ID."
    ) {
      res.status(400).json({ status: "error", message });
      return;
    }

    if (message === "Resource not found or access denied.") {
      res.status(404).json({ status: "error", message });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Unable to create download URL.",
    });
  }
}

export async function trashResourceController(
  req: Request,
  res: Response,
): Promise<void> {
  const ownerId = req.session.userId;

  if (!ownerId) {
    res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
    return;
  }

  try {
    const resource = await trashResource(
      ownerId,
      req.params.resourceId as string,
    );

    res.status(200).json({
      status: "success",
      data: { resource },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to trash resource.";

    if (
      message === "Invalid user ID." ||
      message === "Invalid resource ID."
    ) {
      res.status(400).json({ status: "error", message });
      return;
    }

    if (message === "Resource not found or access denied.") {
      res.status(404).json({ status: "error", message });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Unable to trash resource.",
    });
  }
}

export async function restoreResourceController(
  req: Request,
  res: Response,
): Promise<void> {
  const ownerId = req.session.userId;

  if (!ownerId) {
    res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
    return;
  }

  try {
    const resource = await restoreResource(
      ownerId,
      req.params.resourceId as string,
    );

    res.status(200).json({
      status: "success",
      data: { resource },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to restore resource.";

    if (
      message === "Invalid user ID." ||
      message === "Invalid resource ID."
    ) {
      res.status(400).json({ status: "error", message });
      return;
    }

    if (message === "Trashed resource not found or access denied.") {
      res.status(404).json({ status: "error", message });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Unable to restore resource.",
    });
  }
}

export async function permanentlyDeleteResourceController(
  req: Request,
  res: Response,
): Promise<void> {
  const ownerId = req.session.userId;

  if (!ownerId) {
    res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
    return;
  }

  try {
    const result = await permanentlyDeleteResource(
      ownerId,
      req.params.resourceId as string,
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to permanently delete resource.";

    if (
      message === "Invalid user ID." ||
      message === "Invalid resource ID."
    ) {
      res.status(400).json({ status: "error", message });
      return;
    }

    if (message === "Trashed resource not found or access denied.") {
      res.status(404).json({ status: "error", message });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Unable to permanently delete resource.",
    });
  }
}

export async function attachResourceController(
  req: Request,
  res: Response,
) {
  const ownerId = req.session.userId;

  if (!ownerId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
  }

  try {
    const { targetType, targetId } = req.body;

    if (
      targetType !== "task" &&
      targetType !== "project"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Target type must be task or project.",
      });
    }

    const attachment = await attachResource(
      ownerId,
      String(req.params.resourceId),
      targetType,
      targetId,
    );

    return res.status(201).json({
      status: "success",
      message: "Resource attached successfully.",
      data: { attachment },
    });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to attach resource.",
    });
  }
}

export async function listResourceAttachmentsController(
  req: Request,
  res: Response,
) {
  const ownerId = req.session.userId;

  if (!ownerId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
  }

  try {
    const attachments = await listResourceAttachments(
      ownerId,
      String(req.params.resourceId),
    );

    return res.status(200).json({
      status: "success",
      data: { attachments },
    });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to list resource attachments.",
    });
  }
}

export async function detachResourceController(
  req: Request,
  res: Response,
) {
  const ownerId = req.session.userId;

  if (!ownerId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
  }

  try {
    const result = await detachResource(
      ownerId,
      String(req.params.resourceId),
      String(req.params.attachmentId),
    );

    return res.status(200).json({
      status: "success",
      message: "Resource detached successfully.",
      data: { attachment: result },
    });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to detach resource.",
    });
  }
}

export async function createResourceUploadIntentController(
  req: Request,
  res: Response,
) {
  const ownerId = req.session.userId;

  if (!ownerId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
  }

  try {
    const result = await createResourceUploadIntent(
      ownerId,
      req.body,
    );

    return res.status(201).json({
      status: "success",
      message: "Upload intent created successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to create upload intent.",
    });
  }
}

export async function completeResourceUploadController(
  req: Request,
  res: Response,
) {
  const ownerId = req.session.userId;

  if (!ownerId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
  }

  try {
    const result = await completeResourceUpload(
      ownerId,
      String(req.params.resourceId),
    );

    return res.status(200).json({
      status: "success",
      message: "Resource upload completed successfully.",
      data: { resource: result },
    });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to complete resource upload.",
    });
  }
}

export async function listTargetAttachmentsController(
  req: Request,
  res: Response,
) {
  const ownerId = req.session.userId;

  if (!ownerId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
  }

  try {
    const { targetType, targetId } = req.params;

    if (targetType !== "task" && targetType !== "project") {
      return res.status(400).json({
        status: "error",
        message: "Target type must be task or project.",
      });
    }

    const attachments = await listTargetAttachments(
      ownerId,
      targetType,
      String(targetId),
    );

    return res.status(200).json({
      status: "success",
      data: { attachments },
    });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to list target attachments.",
    });
  }
}