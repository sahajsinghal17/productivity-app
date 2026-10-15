
import type { Request, Response } from "express";
import {
  createProject,
  listProjects,
  updateProject,
  deleteProject,
  listDeletedProjects,
  restoreProject,
  getProjectProgress,
} from "../services/project.service.js";

export async function createProjectController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const ownerId = req.session.userId;

    if (!ownerId) {
      res.status(401).json({
        status: "error",
        message: "Authentication required.",
      });
      return;
    }

    const project = await createProject(ownerId, req.body);

    res.status(201).json({
      status: "success",
      data: { project },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create project.";

    const isClientError = [
      "Invalid user ID.",
      "Project name is required.",
      "Invalid space ID.",
      "Space ID is required.",
      "Space not found or access denied.",
      "Project name must be a string.",
      "Project name must be between 1 and 120 characters.",
      "Project description must be a string.",
      "Project description cannot exceed 5000 characters.",
      "Invalid project status.",
      "Project color must be a valid hex color.",
      "Project icon must be between 1 and 50 characters.",
      "Start date must be a valid date.",
      "Due date must be a valid date.",
      "Due date cannot be before the start date.",
    ].includes(message);

    res.status(isClientError ? 400 : 500).json({
      status: "error",
      message: isClientError ? message : "Failed to create project.",
    });
  }
}

export async function listProjectsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const ownerId = req.session.userId;

    if (!ownerId) {
      res.status(401).json({
        status: "error",
        message: "Authentication required.",
      });
      return;
    }

    const parsePositiveInteger = (
      value: unknown,
      fieldName: string,
    ): number | undefined => {
      if (value === undefined) return undefined;

      const parsed = Number(value);

      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error(`${fieldName} must be a positive integer.`);
      }

      return parsed;
    };

    const spaceId =
      typeof req.query.spaceId === "string"
        ? req.query.spaceId
        : undefined;

    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : undefined;

    const page = parsePositiveInteger(req.query.page, "Page");
    const limit = parsePositiveInteger(req.query.limit, "Limit");

    if (limit !== undefined && limit > 100) {
      res.status(400).json({
        status: "error",
        message: "Limit cannot exceed 100.",
      });
      return;
    }

    const result = await listProjects(ownerId, {
      spaceId,
      status,
      page,
      limit,
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list projects.";

    const isClientError =
      message === "Invalid user ID." ||
      message === "Invalid space ID." ||
      message === "Space not found or access denied." ||
      message === "Invalid project status." ||
      message === "Page must be a positive integer." ||
      message === "Limit must be a positive integer.";

    res.status(isClientError ? 400 : 500).json({
      status: "error",
      message: isClientError ? message : "Failed to list projects.",
    });
  }
}


export async function updateProjectController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const ownerId = req.session.userId;

    if (!ownerId) {
      res.status(401).json({
        status: "error",
        message: "Authentication required.",
      });
      return;
    }

    const project = await updateProject(
      ownerId,
      req.params.projectId as string,
      req.body,
    );

    res.status(200).json({
      status: "success",
      data: { project },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update project.";

    const clientErrors = [
      "Invalid user ID.",
      "Invalid project ID.",
      "Project not found or access denied.",
      "A project cannot be moved to another space.",
      "Project name must be a string.",
      "Project name must be between 1 and 120 characters.",
      "Project description must be a string.",
      "Project description cannot exceed 5000 characters.",
      "Invalid project status.",
      "Project color must be a valid hex color.",
      "Project icon must be between 1 and 50 characters.",
      "Start date must be a valid date.",
      "Due date must be a valid date.",
      "Due date cannot be before the start date.",
    ];

    const isClientError = clientErrors.includes(message);

    res.status(
      isClientError
        ? message === "Project not found or access denied."
          ? 404
          : 400
        : 500,
    ).json({
      status: "error",
      message: isClientError ? message : "Failed to update project.",
    });
  }
}

export async function deleteProjectController(
  req: Request,
  res: Response,
) {
  const ownerId = req.session.userId;

  if (!ownerId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
  }

  try {
    const project = await deleteProject(
      ownerId,
      req.params.projectId as string,
    );

    return res.status(200).json({
      status: "success",
      message: "Project moved to Trash.",
      data: { project },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";

    if (
      message === "Invalid user ID." ||
      message === "Invalid project ID."
    ) {
      return res.status(400).json({ status: "error", message });
    }

    if (message === "Project not found or access denied.") {
      return res.status(404).json({ status: "error", message });
    }

    console.error("Delete project error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to delete project.",
    });
  }
}

export async function listDeletedProjectsController(
  req: Request,
  res: Response,
) {
  const ownerId = req.session.userId;

  if (!ownerId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
  }

  try {
    const spaceId =
      typeof req.query.spaceId === "string"
        ? req.query.spaceId
        : undefined;

    const projects = await listDeletedProjects(ownerId, spaceId);

    return res.status(200).json({
      status: "success",
      data: { projects },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";

    if (
      message === "Invalid user ID." ||
      message === "Invalid space ID." ||
      message === "Space not found or access denied."
    ) {
      return res.status(400).json({ status: "error", message });
    }

    console.error("List deleted projects error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve deleted projects.",
    });
  }
}

export async function restoreProjectController(
  req: Request,
  res: Response,
) {
  const ownerId = req.session.userId;

  if (!ownerId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
  }

  try {
    const project = await restoreProject(
      ownerId,
      req.params.projectId as string,
    );

    return res.status(200).json({
      status: "success",
      message: "Project restored successfully.",
      data: { project },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";

    if (
      message === "Invalid user ID." ||
      message === "Invalid project ID."
    ) {
      return res.status(400).json({ status: "error", message });
    }

    if (message === "Deleted project not found or access denied.") {
      return res.status(404).json({ status: "error", message });
    }

    console.error("Restore project error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to restore project.",
    });
  }
}

export async function getProjectProgressController(
  req: Request,
  res: Response,
) {
  const ownerId = req.session.userId;

  if (!ownerId) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
  }

  try {
    const progress = await getProjectProgress(
      ownerId,
      req.params.projectId as string,
    );

    return res.status(200).json({
      status: "success",
      data: { progress },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";

    if (
      message === "Invalid user ID." ||
      message === "Invalid project ID."
    ) {
      return res.status(400).json({ status: "error", message });
    }

    if (message === "Project not found or access denied.") {
      return res.status(404).json({ status: "error", message });
    }

    console.error("Get project progress error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve project progress.",
    });
  }
}