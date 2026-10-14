
import mongoose from "mongoose";
import Space from "../models/Space.js";
import Task from "../models/Task.js";
import {
  validateTaskInput,
  type TaskInput,
} from "./task-validation.service.js";

const MAX_TASK_DEPTH = 5;

async function getParentDepth(
  parentTaskId: string,
  ownerId: string,
  spaceId: mongoose.Types.ObjectId,
): Promise<number> {
  let currentId: mongoose.Types.ObjectId | null =
    new mongoose.Types.ObjectId(parentTaskId);
  let depth = 1;
  const visited = new Set<string>();

  while (currentId) {
    const id = currentId.toString();

    if (visited.has(id)) {
      throw new Error("A cycle was detected in the task hierarchy.");
    }

    visited.add(id);

    const parent: {
      _id: mongoose.Types.ObjectId;
      parentTaskId?: mongoose.Types.ObjectId | null;
    } | null = await Task.findOne({
      _id: currentId,
      ownerId,
      spaceId,
      deletedAt: null,
    })
      .select("_id parentTaskId")
      .lean();

    if (!parent) {
      throw new Error("Parent task not found or access denied.");
    }

    currentId = parent.parentTaskId ?? null;

    if (currentId) {
      depth += 1;
    }

    if (depth > MAX_TASK_DEPTH) {
      throw new Error(
        `Task nesting cannot exceed ${MAX_TASK_DEPTH} levels.`,
      );
    }
  }

  return depth;
}

export async function createTask(
  ownerId: string,
  input: TaskInput,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  const validated = validateTaskInput(input);

  if (!validated.title) {
    throw new Error("Title is required.");
  }

  if (!validated.spaceId) {
    throw new Error("A valid spaceId is required.");
  }

  const space = await Space.findOne({
    _id: validated.spaceId,
    ownerId,
  });

  if (!space) {
    throw new Error("Space not found or access denied.");
  }

  if (validated.parentTaskId) {
    const parent = await Task.findOne({
      _id: validated.parentTaskId,
      ownerId,
      spaceId: space._id,
      deletedAt: null,
    }).select("_id status");

    if (!parent) {
      throw new Error("Parent task not found or access denied.");
    }

    if (parent.status === "cancelled") {
      throw new Error("Cannot create a subtask under a cancelled task.");
    }

    const parentDepth = await getParentDepth(
      validated.parentTaskId,
      ownerId,
      space._id,
    );

    if (parentDepth >= MAX_TASK_DEPTH) {
      throw new Error(
        `Task nesting cannot exceed ${MAX_TASK_DEPTH} levels.`,
      );
    }
  }

  const task = await Task.create({
    title: validated.title,
    description: validated.description,
    status: validated.status ?? "todo",
    priority: validated.priority ?? "medium",
    ownerId,
    spaceId: space._id,
    parentTaskId: validated.parentTaskId ?? null,
    projectId: validated.projectId ?? null,
    goalId: validated.goalId ?? null,
    dueDate: validated.dueDate ?? null,
    scheduledStart: validated.scheduledStart ?? null,
    scheduledEnd: validated.scheduledEnd ?? null,
    recurrence: validated.recurrence ?? null,
  });

  return task;
}


export type ListTasksOptions = {
  spaceId?: string;
  status?: string;
  priority?: string;
  parentTaskId?: string | null;
  page?: number;
  limit?: number;
};

export async function listTasks(
  ownerId: string,
  options: ListTasksOptions = {},
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  const {
    spaceId,
    status,
    priority,
    parentTaskId,
    page = 1,
    limit = 50,
  } = options;

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100.");
  }

  const filter: Record<string, unknown> = {
    ownerId,
    deletedAt: null,
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

  if (status !== undefined) {
    if (!["todo", "in_progress", "done", "cancelled"].includes(status)) {
      throw new Error("Invalid task status.");
    }

    filter.status = status;
  }

  if (priority !== undefined) {
    if (!["low", "medium", "high", "urgent"].includes(priority)) {
      throw new Error("Invalid task priority.");
    }

    filter.priority = priority;
  }

  if (parentTaskId !== undefined) {
    if (parentTaskId === null) {
      filter.parentTaskId = null;
    } else {
      if (!mongoose.isValidObjectId(parentTaskId)) {
        throw new Error("Invalid parent task ID.");
      }

      filter.parentTaskId = parentTaskId;
    }
  }

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


export async function updateTask(
  ownerId: string,
  taskId: string,
  input: TaskInput,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(taskId)) {
    throw new Error("Invalid task ID.");
  }

  const task = await Task.findOne({
    _id: taskId,
    ownerId,
    deletedAt: null,
  });

  if (!task) {
    throw new Error("Task not found or access denied.");
  }

  const validated = validateTaskInput(input);

  // Tasks cannot be moved between spaces through this endpoint.
  if (
    validated.spaceId !== undefined &&
    validated.spaceId !== task.spaceId.toString()
  ) {
    throw new Error("Moving tasks between spaces is not supported.");
  }

  const nextParentTaskId =
    validated.parentTaskId !== undefined
      ? validated.parentTaskId
      : task.parentTaskId?.toString() ?? null;

  if (nextParentTaskId) {
    if (nextParentTaskId === taskId) {
      throw new Error("A task cannot be its own parent.");
    }

    const parent = await Task.findOne({
      _id: nextParentTaskId,
      ownerId,
      spaceId: task.spaceId,
      deletedAt: null,
    }).select("_id status");

    if (!parent) {
      throw new Error("Parent task not found or access denied.");
    }

    if (parent.status === "cancelled") {
      throw new Error("Cannot create a subtask under a cancelled task.");
    }

    // Walk upward from the proposed parent to prevent cycles.
    const parentDepth = await getParentDepth(
      nextParentTaskId,
      ownerId,
      task.spaceId,
    );

    if (parentDepth >= MAX_TASK_DEPTH) {
      throw new Error(
        `Task nesting cannot exceed ${MAX_TASK_DEPTH} levels.`,
      );
    }

    let ancestorId: mongoose.Types.ObjectId | null = parent._id;
    const visited = new Set<string>();

    while (ancestorId) {
      const ancestorKey = ancestorId.toString();

      if (ancestorKey === taskId) {
        throw new Error("A task cannot be moved under its own descendant.");
      }

      if (visited.has(ancestorKey)) {
        throw new Error("A cycle was detected in the task hierarchy.");
      }

      visited.add(ancestorKey);

      const ancestor: {
        parentTaskId?: mongoose.Types.ObjectId | null;
      } | null = await Task.findOne({
        _id: ancestorId,
        ownerId,
        spaceId: task.spaceId,
        deletedAt: null,
      })
        .select("parentTaskId")
        .lean();

      if (!ancestor) {
        throw new Error("Parent task not found or access denied.");
      }

      ancestorId = ancestor.parentTaskId ?? null;
    }
  }

  if (validated.title !== undefined) {
    task.title = validated.title;
  }

  if (validated.description !== undefined) {
    task.description = validated.description;
  }

  if (validated.status !== undefined) {
    task.status = validated.status;

    if (validated.status === "done") {
      if (task.completedAt === null) {
        task.completedAt = new Date();
      }
    } else {
      task.completedAt = null;
    }
  }

  if (validated.priority !== undefined) {
    task.priority = validated.priority;
  }

  if (validated.dueDate !== undefined) {
    task.dueDate = validated.dueDate;
  }

  if (validated.scheduledStart !== undefined) {
    task.scheduledStart = validated.scheduledStart;
  }

  if (validated.scheduledEnd !== undefined) {
    task.scheduledEnd = validated.scheduledEnd;
  }

  if (validated.parentTaskId !== undefined) {
    task.parentTaskId = validated.parentTaskId
      ? new mongoose.Types.ObjectId(validated.parentTaskId)
      : null;
  }

  if (validated.projectId !== undefined) {
    task.projectId = validated.projectId
      ? new mongoose.Types.ObjectId(validated.projectId)
      : null;
  }

  if (validated.goalId !== undefined) {
    task.goalId = validated.goalId
      ? new mongoose.Types.ObjectId(validated.goalId)
      : null;
  }

  if (validated.recurrence !== undefined) {
    task.recurrence = validated.recurrence;
  }

  await task.save();

  return task;
}


export async function deleteTask(
  ownerId: string,
  taskId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(taskId)) {
    throw new Error("Invalid task ID.");
  }

  const task = await Task.findOne({
    _id: taskId,
    ownerId,
    deletedAt: null,
  });

  if (!task) {
    throw new Error("Task not found or access denied.");
  }

  task.deletedAt = new Date();
  await task.save();

  return task;
}


export async function listDeletedTasks(
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

  const tasks = await Task.find(filter)
    .sort({ deletedAt: -1, _id: -1 })
    .lean();

  return tasks;
}

export async function restoreTask(
  ownerId: string,
  taskId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(taskId)) {
    throw new Error("Invalid task ID.");
  }

  const task = await Task.findOne({
    _id: taskId,
    ownerId,
    deletedAt: { $ne: null },
  });

  if (!task) {
    throw new Error("Deleted task not found or access denied.");
  }

  task.deletedAt = null;
  await task.save();

  return task;
}

export async function permanentlyDeleteTask(
  ownerId: string,
  taskId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(taskId)) {
    throw new Error("Invalid task ID.");
  }

  const result = await Task.deleteOne({
    _id: taskId,
    ownerId,
    deletedAt: { $ne: null },
  });

  if (result.deletedCount === 0) {
    throw new Error("Deleted task not found or access denied.");
  }

  return { deleted: true };
}
