
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Task } from "@/types/task";

type CalendarTasksResponse = {
  status: string;
  data: {
    tasks: Task[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export function useCalendarTasks(activeSpaceId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState("");

  const loadTasks = useCallback(async () => {
    if (!activeSpaceId) {
      setTasks([]);
      setIsLoadingTasks(false);
      setTaskError("");
      return;
    }

    setIsLoadingTasks(true);
    setTaskError("");

    try {
      const firstPage = await apiRequest<CalendarTasksResponse>(
        `/tasks?spaceId=${encodeURIComponent(activeSpaceId)}&limit=100&page=1`,
        { cache: "no-store" },
      );

      const allTasks = [...firstPage.data.tasks];

      for (
        let page = 2;
        page <= firstPage.data.pagination.totalPages;
        page += 1
      ) {
        const response = await apiRequest<CalendarTasksResponse>(
          `/tasks?spaceId=${encodeURIComponent(activeSpaceId)}&limit=100&page=${page}`,
          { cache: "no-store" },
        );

        allTasks.push(...response.data.tasks);
      }

      setTasks(allTasks);
    } catch (error) {
      setTaskError(
        error instanceof Error
          ? error.message
          : "Unable to load calendar tasks.",
      );
    } finally {
      setIsLoadingTasks(false);
    }
  }, [activeSpaceId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    isLoadingTasks,
    taskError,
    loadTasks,
  };
}
