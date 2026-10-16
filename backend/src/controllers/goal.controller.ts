
import type { Request, Response } from "express";
import {
  createGoal,
  listGoals,
  updateGoal,
  getGoalProgress,
  deleteGoal,
  listDeletedGoals,
  restoreGoal,
  permanentlyDeleteGoal,
} from "../services/goal.service.js";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function sendServiceError(
  res: Response,
  error: unknown,
  fallback: string,
  options: {
    notFound?: string[];
    badRequest?: string[];
  } = {},
): void {
  const message = getErrorMessage(error, fallback);

  if (options.notFound?.includes(message)) {
    res.status(404).json({ status: "error", message });
    return;
  }

  if (
    options.badRequest?.includes(message) ||
    message.startsWith("Invalid ") ||
    message.startsWith("Goal nesting cannot exceed") ||
    message.startsWith("description ") ||
    message.startsWith("targetDate ") ||
    message.startsWith("startDate ") ||
    message.startsWith("status ") ||
    message.startsWith("color ")
  ) {
    res.status(400).json({ status: "error", message });
    return;
  }

  res.status(500).json({
    status: "error",
    message: fallback,
  });
}

export async function createGoalController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const goal = await createGoal(req.session.userId!, req.body);

    res.status(201).json({
      status: "success",
      data: { goal },
    });
  } catch (error) {
    sendServiceError(res, error, "Unable to create goal.", {
      badRequest: [
        "Goal name is required.",
        "Space ID is required.",
        "Space not found or access denied.",
        "Parent goal not found in this space or access denied.",
        "One or more projects were not found in this space or access denied.",
      ],
    });
  }
}

export async function listGoalsController(
  req: Request,
  res: Response,
): Promise<void> {
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

    const result = await listGoals(req.session.userId!, {
      spaceId:
        typeof req.query.spaceId === "string"
          ? req.query.spaceId
          : undefined,
      status:
        typeof req.query.status === "string"
          ? req.query.status
          : undefined,
      page: parseOptionalInteger(req.query.page, "page"),
      limit: parseOptionalInteger(req.query.limit, "limit"),
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    sendServiceError(res, error, "Unable to list goals.", {
      notFound: ["Space not found or access denied."],
    });
  }
}

export async function updateGoalController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const goal = await updateGoal(
      req.session.userId!,
      req.params.goalId as string,
      req.body,
    );

    res.status(200).json({
      status: "success",
      data: { goal },
    });
  } catch (error) {
    sendServiceError(res, error, "Unable to update goal.", {
      notFound: ["Goal not found or access denied."],
      badRequest: [
        "Moving goals between spaces is not supported.",
        "Parent goal not found or access denied.",
        "A goal cannot be its own parent.",
        "A goal cannot be moved under its own descendant.",
        "A cycle was detected in the goal hierarchy.",
        "One or more projects were not found in this space or access denied.",
      ],
    });
  }
}

export async function getGoalProgressController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const progress = await getGoalProgress(
      req.session.userId!,
      req.params.goalId as string,
    );

    res.status(200).json({
      status: "success",
      data: { progress },
    });
  } catch (error) {
    sendServiceError(res, error, "Unable to calculate goal progress.", {
      notFound: ["Goal not found or access denied."],
    });
  }
}

export async function deleteGoalController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const goal = await deleteGoal(
      req.session.userId!,
      req.params.goalId as string,
    );

    res.status(200).json({
      status: "success",
      data: { goal },
    });
  } catch (error) {
    sendServiceError(res, error, "Unable to delete goal.", {
      notFound: ["Goal not found or access denied."],
    });
  }
}

export async function listDeletedGoalsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const spaceId =
      typeof req.query.spaceId === "string"
        ? req.query.spaceId
        : undefined;

    if (req.query.spaceId !== undefined && spaceId === undefined) {
      throw new Error("Invalid space ID.");
    }

    const goals = await listDeletedGoals(
      req.session.userId!,
      spaceId,
    );

    res.status(200).json({
      status: "success",
      data: { goals },
    });
  } catch (error) {
    sendServiceError(res, error, "Unable to list deleted goals.", {
      notFound: ["Space not found or access denied."],
    });
  }
}

export async function restoreGoalController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const goal = await restoreGoal(
      req.session.userId!,
      req.params.goalId as string,
    );

    res.status(200).json({
      status: "success",
      data: { goal },
    });
  } catch (error) {
    sendServiceError(res, error, "Unable to restore goal.", {
      notFound: [
        "Deleted goal not found or access denied.",
        "Goal's space not found or access denied.",
        "Restore the parent goal before restoring this goal.",
      ],
    });
  }
}

export async function permanentlyDeleteGoalController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const goal = await permanentlyDeleteGoal(
      req.session.userId!,
      req.params.goalId as string,
    );

    res.status(200).json({
      status: "success",
      message: "Goal permanently deleted.",
      data: { goal },
    });
  } catch (error) {
    sendServiceError(res, error, "Unable to permanently delete goal.", {
      notFound: ["Deleted goal not found or access denied."],
    });
  }
}
