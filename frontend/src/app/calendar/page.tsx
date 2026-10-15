"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { Task, TaskPriority } from "@/types/task";
import {
  WorkspaceLayout,
  type WorkspaceSpace,
  type WorkspaceUser,
} from "@/components/layout/WorkspaceLayout";
import { useCalendarTasks } from "@/hooks/use-calendar-tasks";

type SpacesResponse = {
  status: string;
  data: { spaces: WorkspaceSpace[] };
};

type TaskResponse = {
  status: string;
  data: { task: Task };
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const priorityStyles: Record<TaskPriority, string> = {
  low: "border-l-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium:
    "border-l-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
  high: "border-l-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200",
  urgent:
    "border-l-red-500 bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200",
};

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateKey(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return dateKey(date);
}

function formatTime(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTaskLabel(task: Task, dayKey: string): string {
  const scheduledKey = getDateKey(task.scheduledStart);

  if (scheduledKey === dayKey) {
    const start = formatTime(task.scheduledStart);
    const end = formatTime(task.scheduledEnd);

    if (start && end) return `${start}–${end}`;
    if (start) return start;
  }

  return "Due";
}

export default function CalendarPage() {
  const router = useRouter();

  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [spaces, setSpaces] = useState<WorkspaceSpace[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");

  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] =
    useState<TaskPriority>("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState(() =>
    dateKey(new Date()),
  );
  const [quickAddError, setQuickAddError] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const {
    tasks,
    isLoadingTasks,
    taskError,
    loadTasks,
  } = useCalendarTasks(activeSpaceId);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const meResponse = await apiRequest<{
          status: string;
          data: { user: WorkspaceUser };
        }>("/auth/me");

        if (cancelled) return;
        setUser(meResponse.data.user);

        const spacesResponse =
          await apiRequest<SpacesResponse>("/spaces");

        if (cancelled) return;

        setSpaces(spacesResponse.data.spaces);

        const defaultSpace = spacesResponse.data.spaces.find(
          (space) => space.isDefault,
        );

        setActiveSpaceId(
          defaultSpace?._id ?? spacesResponse.data.spaces[0]?._id ?? "",
        );
      } catch (error) {
        if (cancelled) return;

        if (
          error instanceof Error &&
          error.message.toLowerCase().includes("authenticated")
        ) {
          router.replace("/auth/login");
          return;
        }

        setWorkspaceError(
          error instanceof Error
            ? error.message
            : "Unable to load your workspace.",
        );
      } finally {
        if (!cancelled) {
          setIsCheckingAuth(false);
          setIsLoadingSpaces(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );

    // Start the calendar on Monday.
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(
      firstOfMonth.getDate() - ((firstOfMonth.getDay() + 6) % 7),
    );

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, Task[]>();

    for (const task of tasks) {
      const dates = new Set<string>();

      const dueKey = getDateKey(task.dueDate);
      const scheduledKey = getDateKey(task.scheduledStart);

      if (dueKey) dates.add(dueKey);
      if (scheduledKey) dates.add(scheduledKey);

      for (const key of dates) {
        const existing = grouped.get(key) ?? [];
        existing.push(task);
        grouped.set(key, existing);
      }
    }

    for (const dayTasks of grouped.values()) {
      dayTasks.sort((a, b) => {
        const aTime = a.scheduledStart
          ? new Date(a.scheduledStart).getTime()
          : Number.POSITIVE_INFINITY;
        const bTime = b.scheduledStart
          ? new Date(b.scheduledStart).getTime()
          : Number.POSITIVE_INFINITY;

        return aTime - bTime || a.title.localeCompare(b.title);
      });
    }

    return grouped;
  }, [tasks]);

  const selectedDateKey = dateKey(selectedDate);
  const selectedDateTasks = tasksByDate.get(selectedDateKey) ?? [];

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  }, []);

  function changeMonth(offset: number) {
    setCurrentMonth(
      (month) =>
        new Date(month.getFullYear(), month.getMonth() + offset, 1),
    );
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await apiRequest("/auth/logout", { method: "POST" });
      router.replace("/auth/login");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Unable to log out.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleQuickAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newTaskTitle.trim();
    if (!title || !activeSpaceId) return;

    setIsCreatingTask(true);
    setQuickAddError("");

    try {
      await apiRequest<TaskResponse>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          spaceId: activeSpaceId,
          priority: newTaskPriority,
          dueDate: newTaskDueDate || undefined,
        }),
      });

      await loadTasks();
      setIsQuickAddOpen(false);
      setNewTaskTitle("");
      setNewTaskPriority("medium");
    } catch (error) {
      setQuickAddError(
        error instanceof Error
          ? error.message
          : "Unable to create the task.",
      );
    } finally {
      setIsCreatingTask(false);
    }
  }

  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  if (isCheckingAuth || !user) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading your workspace…
        </p>
        </main>
    );
  }

  return (
    <WorkspaceLayout
      user={user}
      spaces={spaces}
      activeSpaceId={activeSpaceId}
      onSpaceChange={setActiveSpaceId}
      isLoadingSpaces={isLoadingSpaces}
      spaceError={workspaceError}
      isLoggingOut={isLoggingOut}
      logoutError={logoutError}
      onLogout={handleLogout}
      onQuickAdd={() => {
        setNewTaskDueDate(selectedDateKey);
        setQuickAddError("");
        setIsQuickAddOpen(true);
      }}
      onSpaceCreated={(createdSpace) => {
        setSpaces((currentSpaces) =>
            [...currentSpaces, createdSpace].sort(
            (a, b) =>
                Number(b.isDefault) - Number(a.isDefault) ||
                a.name.localeCompare(b.name),
            ),
        );
        setActiveSpaceId(createdSpace._id);
      }}
    >
      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Calendar
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              See your scheduled tasks and deadlines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        {(workspaceError || taskError) && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            {workspaceError || taskError}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {monthLabel}
            </h2>
            {isLoadingTasks && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Loading tasks…
              </span>
            )}
          </div>

          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
            {weekdays.map((day) => (
              <div
                key={day}
                className="px-1 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 sm:px-3"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const key = dateKey(day);
              const isCurrentMonth =
                day.getMonth() === currentMonth.getMonth();
              const isToday = key === dateKey(new Date());
              const isSelected = key === selectedDateKey;
              const dayTasks = tasksByDate.get(key) ?? [];

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => {
                    setSelectedDate(day);
                    if (!isCurrentMonth) {
                      setCurrentMonth(
                        new Date(day.getFullYear(), day.getMonth(), 1),
                      );
                    }
                  }}
                  className={`min-h-24 min-w-0 border-b border-r border-slate-100 p-1 text-left transition-colors sm:min-h-32 sm:p-2 dark:border-slate-800 ${
                    isSelected
                      ? "bg-blue-50/70 dark:bg-blue-950/20"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-blue-600 font-semibold text-white"
                        : isCurrentMonth
                          ? "text-slate-800 dark:text-slate-200"
                          : "text-slate-400 dark:text-slate-600"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  <div className="mt-1 space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task._id}
                        title={`${task.title} · ${getTaskLabel(task, key)}`}
                        className={`truncate rounded border-l-2 px-1 py-1 text-[10px] leading-tight sm:text-xs ${
                          priorityStyles[task.priority]
                        }`}
                      >
                        <span className="hidden sm:inline">
                          {getTaskLabel(task, key)}{" "}
                        </span>
                        {task.title}
                      </div>
                    ))}

                    {dayTasks.length > 3 && (
                      <p className="px-1 text-[10px] text-slate-500 dark:text-slate-400">
                        +{dayTasks.length - 3} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {selectedDateTasks.length}{" "}
                {selectedDateTasks.length === 1 ? "task" : "tasks"} scheduled
                or due
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewTaskDueDate(selectedDateKey);
                setQuickAddError("");
                setIsQuickAddOpen(true);
              }}
              disabled={!activeSpaceId}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add task
            </button>
          </div>

          {isCheckingAuth || isLoadingSpaces ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading your workspace…
            </p>
          ) : selectedDateTasks.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                Nothing scheduled for this day
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Add a task and it will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
              {selectedDateTasks.map((task) => (
                <div
                  key={task._id}
                  className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      task.priority === "urgent"
                        ? "bg-red-500"
                        : task.priority === "high"
                          ? "bg-orange-500"
                          : task.priority === "medium"
                            ? "bg-blue-500"
                            : "bg-slate-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-slate-900 dark:text-white">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {getTaskLabel(task, selectedDateKey)}
                      {" · "}
                      {task.status.replace("_", " ")}
                      {" · "}
                      {task.priority} priority
                    </p>
                    {task.description && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {isQuickAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCreatingTask) {
              setIsQuickAddOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-quick-add-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="calendar-quick-add-title"
                className="text-lg font-semibold text-slate-900 dark:text-white"
              >
                Add a task
              </h2>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setIsQuickAddOpen(false)}
                disabled={isCreatingTask}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div>
                <label
                  htmlFor="calendar-task-title"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Task title
                </label>
                <input
                  id="calendar-task-title"
                  autoFocus
                  required
                  maxLength={200}
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  placeholder="What do you need to do?"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="calendar-task-date"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Due date
                </label>
                <input
                  id="calendar-task-date"
                  type="date"
                  value={newTaskDueDate}
                  onChange={(event) => setNewTaskDueDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="calendar-task-priority"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Priority
                </label>
                <select
                  id="calendar-task-priority"
                  value={newTaskPriority}
                  onChange={(event) =>
                    setNewTaskPriority(event.target.value as TaskPriority)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {quickAddError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {quickAddError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  disabled={isCreatingTask}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask || !activeSpaceId}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingTask ? "Adding…" : "Add task"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </WorkspaceLayout>
  );
}