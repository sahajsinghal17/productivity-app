
export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "done",
  "cancelled",
] as const;

export const TASK_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type TaskInput = {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  dueDate?: unknown;
  scheduledStart?: unknown;
  scheduledEnd?: unknown;
  parentTaskId?: unknown;
  projectId?: unknown;
  goalId?: unknown;
  recurrence?: unknown;
  spaceId?: string;
};

export type ValidatedTaskInput = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  parentTaskId?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  recurrence?: Record<string, unknown> | null;
  spaceId?: string;
};

export function validateTaskInput(
  input: TaskInput,
): ValidatedTaskInput {
  const result: ValidatedTaskInput = {};

  if (input.title !== undefined) {
    if (typeof input.title !== "string") {
      throw new Error("Title must be a string.");
    }

    const title = input.title.trim();

    if (!title) {
      throw new Error("Title is required.");
    }

    if (title.length > 200) {
      throw new Error("Title cannot exceed 200 characters.");
    }

    result.title = title;
  }

  if (input.description !== undefined) {
    if (typeof input.description !== "string") {
      throw new Error("Description must be a string.");
    }

    const description = input.description.trim();

    if (description.length > 10000) {
      throw new Error("Description cannot exceed 10000 characters.");
    }

    result.description = description;
  }

  if (input.status !== undefined) {
    if (
      typeof input.status !== "string" ||
      !TASK_STATUSES.includes(input.status as TaskStatus)
    ) {
      throw new Error("Invalid task status.");
    }

    result.status = input.status as TaskStatus;
  }

  if (input.priority !== undefined) {
    if (
      typeof input.priority !== "string" ||
      !TASK_PRIORITIES.includes(input.priority as TaskPriority)
    ) {
      throw new Error("Invalid task priority.");
    }

    result.priority = input.priority as TaskPriority;
  }

  for (const field of ["dueDate", "scheduledStart", "scheduledEnd"] as const) {
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

  for (const field of ["parentTaskId", "projectId", "goalId"] as const) {
    if (input[field] === undefined) continue;

    const value = input[field];

    if (value === null || value === "") {
      result[field] = null;
      continue;
    }

    if (
      typeof value !== "string" ||
      !/^[a-f\d]{24}$/i.test(value)
    ) {
      throw new Error(`${field} must be a valid ID or null.`);
    }

    result[field] = value;
  }

  if (input.recurrence !== undefined) {
    const value = input.recurrence;

    if (value === null) {
      result.recurrence = null;
    } else if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      result.recurrence = value as Record<string, unknown>;
    } else {
      throw new Error("Recurrence must be an object or null.");
    }
  }

  if (
    result.scheduledStart instanceof Date &&
    result.scheduledEnd instanceof Date &&
    result.scheduledEnd < result.scheduledStart
  ) {
    throw new Error("Scheduled end must be at or after scheduled start.");
  }

  if (input.spaceId !== undefined) {
    if (
        typeof input.spaceId !== "string" ||
        !/^[a-f\d]{24}$/i.test(input.spaceId)
    ) {
        throw new Error("spaceId must be a valid ID.");
    }

    result.spaceId = input.spaceId;
  }

  return result;
}
