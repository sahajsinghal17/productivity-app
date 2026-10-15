
import mongoose from "mongoose";
import Project from "../models/Project.js";
import Space from "../models/Space.js";
import {
  validateProjectInput,
  type ProjectInput,
} from "./project-validation.service.js";
import Task from "../models/Task.js";

export async function createProject(
  ownerId: string,
  input: ProjectInput,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  const validated = validateProjectInput(input);

  if (!validated.name) {
    throw new Error("Project name is required.");
  }

  if (!validated.spaceId) {
    throw new Error("Space ID is required.");
  }

  const space = await Space.findOne({
    _id: validated.spaceId,
    ownerId,
  });

  if (!space) {
    throw new Error("Space not found or access denied.");
  }

  const project = await Project.create({
    ...validated,
    ownerId,
    spaceId: validated.spaceId,
  });

  return project;
}

export type ListProjectsOptions = {
  spaceId?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export async function listProjects(
  ownerId: string,
  options: ListProjectsOptions = {},
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  const page = Math.max(1, Math.floor(options.page ?? 1));
  const limit = Math.min(
    100,
    Math.max(1, Math.floor(options.limit ?? 20)),
  );

  const filter: Record<string, unknown> = {
    ownerId,
    deletedAt: null,
  };

  if (options.spaceId) {
    if (!mongoose.isValidObjectId(options.spaceId)) {
      throw new Error("Invalid space ID.");
    }

    const space = await Space.findOne({
      _id: options.spaceId,
      ownerId,
    });

    if (!space) {
      throw new Error("Space not found or access denied.");
    }

    filter.spaceId = options.spaceId;
  }

  if (options.status) {
    const validStatuses = [
      "planning",
      "active",
      "on_hold",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(options.status)) {
      throw new Error("Invalid project status.");
    }

    filter.status = options.status;
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateProject(
  ownerId: string,
  projectId: string,
  input: ProjectInput,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(projectId)) {
    throw new Error("Invalid project ID.");
  }

  const project = await Project.findOne({
    _id: projectId,
    ownerId,
    deletedAt: null,
  });

  if (!project) {
    throw new Error("Project not found or access denied.");
  }

  const validated = validateProjectInput(input);

  // Projects cannot be moved to a different space through updates.
  if (validated.spaceId && validated.spaceId !== project.spaceId.toString()) {
    throw new Error("A project cannot be moved to another space.");
  }

  // Validate date consistency against both new and existing values.
  const nextStartDate =
    validated.startDate !== undefined
      ? validated.startDate
      : project.startDate;

  const nextDueDate =
    validated.dueDate !== undefined
      ? validated.dueDate
      : project.dueDate;

  if (
    nextStartDate &&
    nextDueDate &&
    nextDueDate < nextStartDate
  ) {
    throw new Error("Due date cannot be before the start date.");
  }

  if (validated.name !== undefined) {
    project.name = validated.name;
  }

  if (validated.description !== undefined) {
    project.description = validated.description;
  }

  if (validated.status !== undefined) {
    project.status = validated.status;

    if (validated.status === "completed") {
      project.completedAt ??= new Date();
    } else {
      project.completedAt = null;
    }
  }

  if (validated.color !== undefined) {
    project.color = validated.color;
  }

  if (validated.icon !== undefined) {
    project.icon = validated.icon;
  }

  if (validated.startDate !== undefined) {
    project.startDate = validated.startDate;
  }

  if (validated.dueDate !== undefined) {
    project.dueDate = validated.dueDate;
  }

  await project.save();

  return project;
}

export async function deleteProject(
  ownerId: string,
  projectId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(projectId)) {
    throw new Error("Invalid project ID.");
  }

  const project = await Project.findOne({
    _id: projectId,
    ownerId,
    deletedAt: null,
  });

  if (!project) {
    throw new Error("Project not found or access denied.");
  }

  project.deletedAt = new Date();
  await project.save();

  return project;
}

export async function listDeletedProjects(
  ownerId: string,
  spaceId?: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  const filter: Record<string, unknown> = {
    ownerId,
    deletedAt: { $ne: null },
  };

  if (spaceId !== undefined) {
    if (!mongoose.isValidObjectId(spaceId)) {
      throw new Error("Invalid space ID.");
    }

    const space = await Space.findOne({
      _id: spaceId,
      ownerId,
    }).select("_id");

    if (!space) {
      throw new Error("Space not found or access denied.");
    }

    filter.spaceId = space._id;
  }

  const projects = await Project.find(filter)
    .sort({ deletedAt: -1, _id: -1 })
    .lean();

  return projects;
}

export async function restoreProject(
  ownerId: string,
  projectId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(projectId)) {
    throw new Error("Invalid project ID.");
  }

  const project = await Project.findOne({
    _id: projectId,
    ownerId,
    deletedAt: { $ne: null },
  });

  if (!project) {
    throw new Error("Deleted project not found or access denied.");
  }

  project.deletedAt = null;
  await project.save();

  return project;
}

export async function getProjectProgress(
  ownerId: string,
  projectId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(projectId)) {
    throw new Error("Invalid project ID.");
  }

  const project = await Project.findOne({
    _id: projectId,
    ownerId,
    deletedAt: null,
  }).select("_id ownerId");

  if (!project) {
    throw new Error("Project not found or access denied.");
  }

  const [result] = await Task.aggregate([
    {
      $match: {
        ownerId: project.ownerId,
        projectId: project._id,
        deletedAt: null,
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", "done"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const totalTasks = result?.totalTasks ?? 0;
  const completedTasks = result?.completedTasks ?? 0;

  return {
    projectId: project._id,
    totalTasks,
    completedTasks,
    progress: totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100),
  };
}
