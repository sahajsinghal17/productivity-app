
import type { Request, Response } from "express";
import {
  createTask,
  listTasks,
  updateTask,
  deleteTask,
  listDeletedTasks,
  restoreTask,
  permanentlyDeleteTask,
} from "../services/task.service.js";

export async function createTaskController(
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
    const task = await createTask(ownerId, req.body);

    res.status(201).json({
      status: "success",
      data: { task },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create task.";

    const isClientError =
      message.includes("required") ||
      message.includes("Invalid") ||
      message.includes("must be") ||
      message.includes("cannot exceed") ||
      message.includes("cancelled") ||
      message.includes("not found") ||
      message.includes("cycle");

    res.status(isClientError ? 400 : 500).json({
      status: "error",
      message: isClientError ? message : "Unable to create task.",
    });
  }
}


export async function listTasksController(
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

      if (
        typeof value !== "string" ||
        !/^\d+$/.test(value)
      ) {
        throw new Error(`Invalid ${field}.`);
      }

      const parsed = Number(value);

      if (!Number.isSafeInteger(parsed)) {
        throw new Error(`Invalid ${field}.`);
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

    const priority =
      typeof req.query.priority === "string"
        ? req.query.priority
        : undefined;

    const rawParentTaskId = req.query.parentTaskId;
    let parentTaskId: string | null | undefined;

    if (rawParentTaskId === "null") {
      parentTaskId = null;
    } else if (typeof rawParentTaskId === "string") {
      parentTaskId = rawParentTaskId;
    } else if (rawParentTaskId !== undefined) {
      throw new Error("Invalid parentTaskId.");
    }

    for (const [field, value] of [
      ["spaceId", req.query.spaceId],
      ["status", req.query.status],
      ["priority", req.query.priority],
    ] as const) {
      if (value !== undefined && typeof value !== "string") {
        throw new Error(`Invalid ${field}.`);
      }
    }

    const result = await listTasks(ownerId, {
      spaceId,
      status,
      priority,
      parentTaskId,
      page: parseOptionalInteger(req.query.page, "page"),
      limit: parseOptionalInteger(req.query.limit, "limit"),
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to list tasks.";

    const isClientError =
      message.startsWith("Invalid ") ||
      message.includes("must be") ||
      message.includes("not found");

    res.status(isClientError ? 400 : 500).json({
      status: "error",
      message: isClientError ? message : "Unable to list tasks.",
    });
  }
}

export async function updateTaskController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const task = await updateTask(
      req.session.userId!,
      req.params.taskId as string,
      req.body,
    );

    res.status(200).json({
      status: "success",
      data: { task },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update task.";

    const badRequestMessages = [
      "Invalid user ID.",
      "Invalid task ID.",
      "Task not found or access denied.",
      "Title is required.",
      "A valid spaceId is required.",
      "Space not found or access denied.",
      "Invalid parent task ID.",
      "Parent task not found or access denied.",
      "Cannot create a subtask under a cancelled task.",
      "A task cannot be its own parent.",
      "A task cannot be moved under its own descendant.",
      "A cycle was detected in the task hierarchy.",
      "Moving tasks between spaces is not supported.",
      "Project not found in this space or access denied.",
    ];

    const isBadRequest =
      badRequestMessages.includes(message) ||
      message.startsWith("Task nesting cannot exceed") ||
      message.startsWith("title ") ||
      message.startsWith("description ") ||
      message.startsWith("Invalid ") ||
      message.startsWith("dueDate ") ||
      message.startsWith("scheduledStart ") ||
      message.startsWith("scheduledEnd ") ||
      message.startsWith("status ") ||
      message.startsWith("priority ") ||
      message.startsWith("parentTaskId ") ||
      message.startsWith("projectId ") ||
      message.startsWith("goalId ") ||
      message.startsWith("recurrence ") ||
      message.startsWith("scheduledEnd must");

    res.status(isBadRequest ? 400 : 500).json({
      status: "error",
      message: isBadRequest ? message : "Failed to update task.",
    });
  }
}


export async function deleteTaskController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const task = await deleteTask(
      req.session.userId!,
      req.params.taskId as string,
    );

    res.status(200).json({
      status: "success",
      data: { task },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete task.";

    const isBadRequest =
      message === "Invalid user ID." ||
      message === "Invalid task ID.";

    const isNotFound =
      message === "Task not found or access denied.";

    res.status(isBadRequest ? 400 : isNotFound ? 404 : 500).json({
      status: "error",
      message:
        isBadRequest || isNotFound ? message : "Failed to delete task.",
    });
  }
}


export async function listDeletedTasksController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const spaceId =
      typeof req.query.spaceId === "string"
        ? req.query.spaceId
        : undefined;

    const tasks = await listDeletedTasks(
      req.session.userId!,
      spaceId,
    );

    res.status(200).json({
      status: "success",
      data: { tasks },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to list deleted tasks.";

    const isBadRequest =
      message === "Invalid user ID." ||
      message === "Invalid space ID.";

    const isNotFound =
      message === "Space not found or access denied.";

    res.status(isBadRequest ? 400 : isNotFound ? 404 : 500).json({
      status: "error",
      message:
        isBadRequest || isNotFound
          ? message
          : "Failed to list deleted tasks.",
    });
  }
}


export async function restoreTaskController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const task = await restoreTask(
      req.session.userId!,
      req.params.taskId as string,
    );

    res.status(200).json({
      status: "success",
      data: { task },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to restore task.";

    const isBadRequest =
      message === "Invalid user ID." ||
      message === "Invalid task ID.";

    const isNotFound =
      message === "Deleted task not found or access denied.";

    res.status(isBadRequest ? 400 : isNotFound ? 404 : 500).json({
      status: "error",
      message:
        isBadRequest || isNotFound
          ? message
          : "Failed to restore task.",
    });
  }
}

export async function permanentlyDeleteTaskController(
  req: Request,
  res: Response,
) {
  try {
    const ownerId = req.session.userId;
    const taskId = req.params.taskId as string;

    if (!ownerId) {
      res.status(401).json({
        status: "error",
        message: "Authentication required.",
      });
      return;
    }

    const result = await permanentlyDeleteTask(ownerId, taskId);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to permanently delete task.";

    if (message === "Deleted task not found or access denied.") {
      res.status(404).json({ status: "error", message });
      return;
    }

    if (message === "Invalid user ID." || message === "Invalid task ID.") {
      res.status(400).json({ status: "error", message });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Unable to permanently delete task.",
    });
  }
}
