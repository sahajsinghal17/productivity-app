
import mongoose from "mongoose";

export const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type ProjectInput = {
  name?: unknown;
  description?: unknown;
  status?: unknown;
  color?: unknown;
  icon?: unknown;
  spaceId?: unknown;
  startDate?: unknown;
  dueDate?: unknown;
};

export type ValidatedProjectInput = {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  icon?: string;
  spaceId?: string;
  startDate?: Date | null;
  dueDate?: Date | null;
};

function parseDate(value: unknown, fieldName: string): Date | null {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return date;
}

export function validateProjectInput(
  input: ProjectInput,
): ValidatedProjectInput {
  const validated: ValidatedProjectInput = {};

  if ("name" in input) {
    if (typeof input.name !== "string") {
      throw new Error("Project name must be a string.");
    }

    const name = input.name.trim();

    if (!name || name.length > 120) {
      throw new Error("Project name must be between 1 and 120 characters.");
    }

    validated.name = name;
  }

  if ("description" in input) {
    if (typeof input.description !== "string") {
      throw new Error("Project description must be a string.");
    }

    const description = input.description.trim();

    if (description.length > 5000) {
      throw new Error("Project description cannot exceed 5000 characters.");
    }

    validated.description = description;
  }

  if ("status" in input) {
    if (
      typeof input.status !== "string" ||
      !PROJECT_STATUSES.includes(input.status as ProjectStatus)
    ) {
      throw new Error("Invalid project status.");
    }

    validated.status = input.status as ProjectStatus;
  }

  if ("color" in input) {
    if (
      typeof input.color !== "string" ||
      !/^#[0-9A-Fa-f]{6}$/.test(input.color)
    ) {
      throw new Error("Project color must be a valid hex color.");
    }

    validated.color = input.color;
  }

  if ("icon" in input) {
    if (
      typeof input.icon !== "string" ||
      !input.icon.trim() ||
      input.icon.trim().length > 50
    ) {
      throw new Error("Project icon must be between 1 and 50 characters.");
    }

    validated.icon = input.icon.trim();
  }

  if ("spaceId" in input) {
    if (
      typeof input.spaceId !== "string" ||
      !mongoose.isValidObjectId(input.spaceId)
    ) {
      throw new Error("Invalid space ID.");
    }

    validated.spaceId = input.spaceId;
  }

  if ("startDate" in input) {
    validated.startDate = parseDate(input.startDate, "Start date");
  }

  if ("dueDate" in input) {
    validated.dueDate = parseDate(input.dueDate, "Due date");
  }

  const startDate =
    validated.startDate !== undefined
      ? validated.startDate
      : undefined;
  const dueDate =
    validated.dueDate !== undefined
      ? validated.dueDate
      : undefined;

  if (startDate && dueDate && dueDate < startDate) {
    throw new Error("Due date cannot be before the start date.");
  }

  return validated;
}
