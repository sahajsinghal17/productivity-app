
import mongoose from "mongoose";
import Goal from "../models/Goal.js";
import Project from "../models/Project.js";
import Space from "../models/Space.js";
import Task from "../models/Task.js";
import {
  validateGoalInput,
  type GoalInput,
} from "./goal-validation.service.js";

export async function createGoal(
  ownerId: string,
  input: GoalInput,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  const validated = validateGoalInput(input);

  if (!validated.name) {
    throw new Error("Goal name is required.");
  }

  if (!validated.spaceId) {
    throw new Error("Space ID is required.");
  }

  const space = await Space.findOne({
    _id: validated.spaceId,
    ownerId,
  }).select("_id");

  if (!space) {
    throw new Error("Space not found or access denied.");
  }

  if (validated.parentGoalId) {
    const parent = await Goal.findOne({
        _id: validated.parentGoalId,
        ownerId,
        spaceId: space._id,
        deletedAt: null,
    }).select("_id");

    if (!parent) {
        throw new Error("Parent goal not found in this space or access denied.");
    }

    await validateParentGoal(
        ownerId,
        null,
        space._id,
        validated.parentGoalId,
    );
  }

  const projectIds = (validated.projectIds ?? []).map(
    (id) => new mongoose.Types.ObjectId(id),
  );

  if (projectIds.length > 0) {
    const matchingProjects = await Project.countDocuments({
      _id: { $in: projectIds },
      ownerId,
      spaceId: space._id,
      deletedAt: null,
    });

    if (matchingProjects !== projectIds.length) {
      throw new Error(
        "One or more projects were not found in this space or access denied.",
      );
    }
  }

  const goal = await Goal.create({
    ...validated,
    ownerId,
    spaceId: space._id,
    parentGoalId: validated.parentGoalId ?? null,
    projectIds,
  });

  return goal;
}

export type ListGoalsOptions = {
  spaceId?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export async function listGoals(
  ownerId: string,
  options: ListGoalsOptions = {},
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

  if (options.spaceId !== undefined) {
    if (!mongoose.isValidObjectId(options.spaceId)) {
      throw new Error("Invalid space ID.");
    }

    const space = await Space.findOne({
      _id: options.spaceId,
      ownerId,
    }).select("_id");

    if (!space) {
      throw new Error("Space not found or access denied.");
    }

    filter.spaceId = space._id;
  }

  if (options.status !== undefined) {
    const validStatuses = [
      "active",
      "completed",
      "on_hold",
      "cancelled",
    ];

    if (!validStatuses.includes(options.status)) {
      throw new Error("Invalid goal status.");
    }

    filter.status = options.status;
  }

  const [goals, total] = await Promise.all([
    Goal.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Goal.countDocuments(filter),
  ]);

  return {
    goals,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


const MAX_GOAL_DEPTH = 5;

async function validateParentGoal(
  ownerId: string,
  goalId: string | null,
  spaceId: mongoose.Types.ObjectId,
  parentGoalId: string | null,
) {
  if (!parentGoalId) return;

  if (goalId && parentGoalId === goalId) {
    throw new Error("A goal cannot be its own parent.");
  }

  let currentId: mongoose.Types.ObjectId | null =
    new mongoose.Types.ObjectId(parentGoalId);

  let depth = 2;
  const visited = new Set<string>();

  while (currentId) {
    const currentKey = currentId.toString();

    if (visited.has(currentKey)) {
      throw new Error("A cycle was detected in the goal hierarchy.");
    }

    visited.add(currentKey);

    const current: {
        _id: mongoose.Types.ObjectId;
        parentGoalId?: mongoose.Types.ObjectId | null;
    } | null = await Goal.findOne({
        _id: currentId,
        ownerId,
        spaceId,
        deletedAt: null,
    })
    .select("_id parentGoalId")
    .lean();

    if (!current) {
      throw new Error("Parent goal not found or access denied.");
    }

    if (goalId && currentKey === goalId) {
      throw new Error("A goal cannot be moved under its own descendant.");
    }

    currentId = current.parentGoalId ?? null;

    if (currentId) {
      depth += 1;
    }

    if (depth > MAX_GOAL_DEPTH) {
      throw new Error(
        `Goal nesting cannot exceed ${MAX_GOAL_DEPTH} levels.`,
      );
    }
  }
}

export async function updateGoal(
  ownerId: string,
  goalId: string,
  input: GoalInput,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(goalId)) {
    throw new Error("Invalid goal ID.");
  }

  const goal = await Goal.findOne({
    _id: goalId,
    ownerId,
    deletedAt: null,
  });

  if (!goal) {
    throw new Error("Goal not found or access denied.");
  }

  const validated = validateGoalInput(input);

  if (
    validated.spaceId !== undefined &&
    validated.spaceId !== goal.spaceId.toString()
  ) {
    throw new Error("Moving goals between spaces is not supported.");
  }

  const nextParentGoalId =
    validated.parentGoalId !== undefined
      ? validated.parentGoalId
      : goal.parentGoalId?.toString() ?? null;

  await validateParentGoal(
    ownerId,
    goalId,
    goal.spaceId,
    nextParentGoalId,
  );

  const nextProjectIds =
    validated.projectIds !== undefined
      ? validated.projectIds
      : goal.projectIds.map((id) => id.toString());

  if (nextProjectIds.length > 0) {
    const projectObjectIds = nextProjectIds.map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const matchingProjects = await Project.countDocuments({
      _id: { $in: projectObjectIds },
      ownerId,
      spaceId: goal.spaceId,
      deletedAt: null,
    });

    if (matchingProjects !== projectObjectIds.length) {
      throw new Error(
        "One or more projects were not found in this space or access denied.",
      );
    }
  }

  const nextStartDate =
    validated.startDate !== undefined
      ? validated.startDate
      : goal.startDate;

  const nextTargetDate =
    validated.targetDate !== undefined
      ? validated.targetDate
      : goal.targetDate;

  if (
    nextStartDate &&
    nextTargetDate &&
    nextTargetDate < nextStartDate
  ) {
    throw new Error("Target date cannot be before the start date.");
  }

  if (validated.name !== undefined) {
    goal.name = validated.name;
  }

  if (validated.description !== undefined) {
    goal.description = validated.description;
  }

  if (validated.status !== undefined) {
    goal.status = validated.status;

    if (validated.status === "completed") {
      goal.completedAt ??= new Date();
    } else {
      goal.completedAt = null;
    }
  }

  if (validated.color !== undefined) {
    goal.color = validated.color;
  }

  if (validated.parentGoalId !== undefined) {
    goal.parentGoalId = validated.parentGoalId
      ? new mongoose.Types.ObjectId(validated.parentGoalId)
      : null;
  }

  if (validated.projectIds !== undefined) {
    goal.projectIds = validated.projectIds.map(
      (id) => new mongoose.Types.ObjectId(id),
    );
  }

  if (validated.startDate !== undefined) {
    goal.startDate = validated.startDate;
  }

  if (validated.targetDate !== undefined) {
    goal.targetDate = validated.targetDate;
  }

  await goal.save();

  return goal;
}

async function getGoalSubtree(
  ownerId: mongoose.Types.ObjectId,
  rootGoalId: mongoose.Types.ObjectId,
  spaceId: mongoose.Types.ObjectId,
) {
  const goals = [];
  let frontier = [rootGoalId.toString()];
  const visited = new Set<string>(frontier);

  while (frontier.length > 0) {
    const children = await Goal.find({
      ownerId,
      spaceId,
      parentGoalId: { $in: frontier },
      deletedAt: null,
    })
      .select("_id projectIds status")
      .lean();

    const nextFrontier: string[] = [];

    for (const child of children) {
      const childId = child._id.toString();

      if (visited.has(childId)) {
        continue;
      }

      visited.add(childId);
      nextFrontier.push(childId);
    }

    frontier = nextFrontier;

    if (visited.size > 1000) {
      throw new Error("Goal hierarchy is too large to calculate progress.");
    }
  }

  return Goal.find({
    _id: { $in: [...visited] },
    ownerId,
    spaceId,
    deletedAt: null,
  })
    .select("_id projectIds status")
    .lean();
}


type GoalProgressResult = {
  goalId: mongoose.Types.ObjectId;
  projectProgress: {
    projectId: mongoose.Types.ObjectId;
    totalTasks: number;
    completedTasks: number;
    progress: number;
  }[];
  directTasks: {
    totalTasks: number;
    completedTasks: number;
  };
  totalContributions: number;
  progress: number;
};

async function calculateGoalProgress(
  ownerId: mongoose.Types.ObjectId,
  goalId: mongoose.Types.ObjectId,
  spaceId: mongoose.Types.ObjectId,
  countedProjectIds: Set<string>,
  visitedGoalIds: Set<string>,
): Promise<GoalProgressResult> {
  const goalKey = goalId.toString();

  if (visitedGoalIds.has(goalKey)) {
    throw new Error("A cycle was detected in the goal hierarchy.");
  }

  const goal = await Goal.findOne({
    _id: goalId,
    ownerId,
    spaceId,
    deletedAt: null,
  }).select("_id status projectIds");

  if (!goal || goal.status === "cancelled") {
    return {
      goalId,
      projectProgress: [],
      directTasks: { totalTasks: 0, completedTasks: 0 },
      totalContributions: 0,
      progress: 0,
    };
  }

  const nextVisitedGoalIds = new Set(visitedGoalIds);
  nextVisitedGoalIds.add(goalKey);

  const contributions: number[] = [];
  const projectProgress: GoalProgressResult["projectProgress"] = [];

  // Projects linked directly to this goal contribute at most once.
  const validProjects = goal.projectIds.length > 0
    ? await Project.find({
        _id: { $in: goal.projectIds },
        ownerId,
        spaceId,
        deletedAt: null,
      }).select("_id")
    : [];

  for (const project of validProjects) {
    const projectKey = project._id.toString();

    if (countedProjectIds.has(projectKey)) {
      continue;
    }

    countedProjectIds.add(projectKey);

    const [result] = await Task.aggregate([
      {
        $match: {
          ownerId,
          spaceId,
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
    const progress = totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

    projectProgress.push({
      projectId: project._id,
      totalTasks,
      completedTasks,
      progress,
    });

    if (totalTasks > 0) {
      contributions.push(progress / 100);
    }
  }

  // Only standalone tasks assigned directly to this goal count here.
  const [directTaskResult] = await Task.aggregate([
    {
      $match: {
        ownerId,
        spaceId,
        goalId: goal._id,
        deletedAt: null,
        status: { $ne: "cancelled" },
        $or: [
          { projectId: null },
          { projectId: { $exists: false } },
        ],
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

  const directTotal = directTaskResult?.totalTasks ?? 0;
  const directCompleted = directTaskResult?.completedTasks ?? 0;

  for (let index = 0; index < directTotal; index++) {
    contributions.push(index < directCompleted ? 1 : 0);
  }

  // Each eligible direct child goal contributes once, using its own progress.
  const children = await Goal.find({
    ownerId,
    spaceId,
    parentGoalId: goal._id,
    deletedAt: null,
    status: { $ne: "cancelled" },
  }).select("_id");

  for (const child of children) {
    const childProgress = await calculateGoalProgress(
      ownerId,
      child._id,
      spaceId,
      countedProjectIds,
      nextVisitedGoalIds,
    );

    if (childProgress.totalContributions > 0) {
      contributions.push(childProgress.progress / 100);
    }
  }

  const totalContributions = contributions.length;
  const completedContributions = contributions.reduce(
    (sum, value) => sum + value,
    0,
  );

  return {
    goalId: goal._id,
    projectProgress,
    directTasks: {
      totalTasks: directTotal,
      completedTasks: directCompleted,
    },
    totalContributions,
    progress: totalContributions === 0
      ? 0
      : Math.round(
          (completedContributions / totalContributions) * 100,
        ),
  };
}

export async function getGoalProgress(
  ownerId: string,
  goalId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(goalId)) {
    throw new Error("Invalid goal ID.");
  }

  const goal = await Goal.findOne({
    _id: goalId,
    ownerId,
    deletedAt: null,
  }).select("_id ownerId spaceId");

  if (!goal) {
    throw new Error("Goal not found or access denied.");
  }

  return calculateGoalProgress(
    goal.ownerId,
    goal._id,
    goal.spaceId,
    new Set<string>(),
    new Set<string>(),
  );
}

export async function deleteGoal(
  ownerId: string,
  goalId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(goalId)) {
    throw new Error("Invalid goal ID.");
  }

  const goal = await Goal.findOne({
    _id: goalId,
    ownerId,
    deletedAt: null,
  });

  if (!goal) {
    throw new Error("Goal not found or access denied.");
  }

  // Detach active direct children before deleting this goal.
  await Goal.updateMany(
    {
      ownerId,
      spaceId: goal.spaceId,
      parentGoalId: goal._id,
      deletedAt: null,
    },
    {
      $set: { parentGoalId: null },
    },
  );

  // Move the selected goal to Trash.
  goal.deletedAt = new Date();
  await goal.save();

  return goal;
}

export async function listDeletedGoals(
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

  return Goal.find(filter)
    .sort({ deletedAt: -1, _id: -1 })
    .lean();
}

export async function restoreGoal(
  ownerId: string,
  goalId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(goalId)) {
    throw new Error("Invalid goal ID.");
  }

  const goal = await Goal.findOne({
    _id: goalId,
    ownerId,
    deletedAt: { $ne: null },
  });

  if (!goal) {
    throw new Error("Deleted goal not found or access denied.");
  }

  // Ensure the goal's space still exists and belongs to this owner.
  const space = await Space.findOne({
    _id: goal.spaceId,
    ownerId,
  }).select("_id");

  if (!space) {
    throw new Error("Goal's space not found or access denied.");
  }

  // A child goal cannot be restored while its parent is in Trash.
  if (goal.parentGoalId) {
    const parent = await Goal.findOne({
        _id: goal.parentGoalId,
        ownerId,
        spaceId: goal.spaceId,
        deletedAt: null,
  }).select("_id");

  if (!parent) {
        throw new Error(
        "Restore the parent goal before restoring this goal.",
        );
    }
  }

  goal.deletedAt = null;
  await goal.save();

  return goal;
}
