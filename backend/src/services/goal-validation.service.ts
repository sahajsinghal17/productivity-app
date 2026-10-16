
export const GOAL_STATUSES = [
  "active",
  "completed",
  "on_hold",
  "cancelled",
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export type GoalInput = {
  name?: unknown;
  description?: unknown;
  status?: unknown;
  color?: unknown;
  parentGoalId?: unknown;
  projectIds?: unknown;
  startDate?: unknown;
  targetDate?: unknown;
  spaceId?: string;
};

export type ValidatedGoalInput = {
  name?: string;
  description?: string;
  status?: GoalStatus;
  color?: string;
  parentGoalId?: string | null;
  projectIds?: string[];
  startDate?: Date | null;
  targetDate?: Date | null;
  spaceId?: string;
};

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function validateGoalInput(
  input: GoalInput,
): ValidatedGoalInput {
  const result: ValidatedGoalInput = {};

  if (input.name !== undefined) {
    if (typeof input.name !== "string") {
      throw new Error("Goal name must be a string.");
    }

    const name = input.name.trim();

    if (!name) {
      throw new Error("Goal name is required.");
    }

    if (name.length > 120) {
      throw new Error("Goal name cannot exceed 120 characters.");
    }

    result.name = name;
  }

  if (input.description !== undefined) {
    if (typeof input.description !== "string") {
      throw new Error("Goal description must be a string.");
    }

    const description = input.description.trim();

    if (description.length > 5000) {
      throw new Error("Goal description cannot exceed 5000 characters.");
    }

    result.description = description;
  }

  if (input.status !== undefined) {
    if (
      typeof input.status !== "string" ||
      !GOAL_STATUSES.includes(input.status as GoalStatus)
    ) {
      throw new Error("Invalid goal status.");
    }

    result.status = input.status as GoalStatus;
  }

  if (input.color !== undefined) {
    if (
      typeof input.color !== "string" ||
      !COLOR_PATTERN.test(input.color)
    ) {
      throw new Error("Goal color must be a valid hex color, such as #6366f1.");
    }

    result.color = input.color;
  }

  if (input.parentGoalId !== undefined) {
    const value = input.parentGoalId;

    if (value === null || value === "") {
      result.parentGoalId = null;
    } else if (
      typeof value === "string" &&
      OBJECT_ID_PATTERN.test(value)
    ) {
      result.parentGoalId = value;
    } else {
      throw new Error("parentGoalId must be a valid ID or null.");
    }
  }

  if (input.projectIds !== undefined) {
    if (!Array.isArray(input.projectIds)) {
      throw new Error("projectIds must be an array of project IDs.");
    }

    const projectIds: string[] = [];

    for (const value of input.projectIds) {
      if (
        typeof value !== "string" ||
        !OBJECT_ID_PATTERN.test(value)
      ) {
        throw new Error("Every projectIds entry must be a valid ID.");
      }

      if (projectIds.includes(value)) {
        throw new Error("Duplicate project IDs are not allowed.");
      }

      projectIds.push(value);
    }

    result.projectIds = projectIds;
  }

  for (const field of ["startDate", "targetDate"] as const) {
    if (input[field] === undefined) continue;

    const value = input[field];

    if (value === null || value === "") {
      result[field] = null;
      continue;
    }

    if (typeof value !== "string" && !(value instanceof Date)) {
      throw new Error(`${field} must be a valid date or null.`);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`${field} must be a valid date.`);
    }

    result[field] = date;
  }

  if (
    result.startDate instanceof Date &&
    result.targetDate instanceof Date &&
    result.targetDate < result.startDate
  ) {
    throw new Error("Target date must be on or after the start date.");
  }

  if (input.spaceId !== undefined) {
    if (
      typeof input.spaceId !== "string" ||
      !OBJECT_ID_PATTERN.test(input.spaceId)
    ) {
      throw new Error("spaceId must be a valid ID.");
    }

    result.spaceId = input.spaceId;
  }

  return result;
}
