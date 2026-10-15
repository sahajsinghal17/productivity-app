
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Task } from "@/types/task";

type TasksResponse = {
  status: string;
  data: { tasks: Task[] };
};

type TaskResponse = {
  status: string;
  data: { task: Task };
};

export function useTasks(activeSpaceId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [isUpdatingTaskId, setIsUpdatingTaskId] = useState<string | null>(
    null,
  );

  const loadTasks = useCallback(async () => {
    if (!activeSpaceId) {
      setTasks([]);
      setIsLoadingTasks(false);
      return;
    }

    setIsLoadingTasks(true);
    setTaskError("");

    try {
      const response = await apiRequest<TasksResponse>(
        `/tasks?spaceId=${encodeURIComponent(activeSpaceId)}&parentTaskId=null&limit=100`,
        { cache: "no-store" },
      );

      setTasks(response.data.tasks);
    } catch (error) {
      setTaskError(
        error instanceof Error ? error.message : "Unable to load tasks.",
      );
    } finally {
      setIsLoadingTasks(false);
    }
  }, [activeSpaceId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleToggleTask = useCallback(
    async (task: Task) => {
      const nextStatus = task.status === "done" ? "todo" : "done";

      setTaskError("");
      setIsUpdatingTaskId(task._id);

      const previousTasks = tasks;

      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask._id === task._id
            ? { ...currentTask, status: nextStatus }
            : currentTask,
        ),
      );

      try {
        const response = await apiRequest<TaskResponse>(
          `/tasks/${task._id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status: nextStatus }),
          },
        );

        setTasks((currentTasks) =>
          currentTasks.map((currentTask) =>
            currentTask._id === task._id
              ? response.data.task
              : currentTask,
          ),
        );
      } catch (error) {
        setTasks(previousTasks);
        setTaskError(
          error instanceof Error
            ? error.message
            : "Unable to update the task.",
        );
      } finally {
        setIsUpdatingTaskId(null);
      }
    },
    [tasks],
  );

  const handleDeleteTask = useCallback(async (task: Task) => {
    const confirmed = window.confirm(
      `Move "${task.title}" to Trash? You can restore it later.`,
    );

    if (!confirmed) return;

    setTaskError("");

    try {
      await apiRequest<TaskResponse>(`/tasks/${task._id}`, {
        method: "DELETE",
      });

      setTasks((currentTasks) =>
        currentTasks.filter((currentTask) => currentTask._id !== task._id),
      );
    } catch (error) {
      setTaskError(
        error instanceof Error ? error.message : "Unable to delete the task.",
      );
    }
  }, []);

  return {
    tasks,
    setTasks,
    isLoadingTasks,
    taskError,
    setTaskError,
    isUpdatingTaskId,
    handleToggleTask,
    handleDeleteTask,
    loadTasks,
  };
}
