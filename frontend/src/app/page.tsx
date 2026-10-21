"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { Task } from "@/types/task";
import { useTasks } from "@/hooks/use-tasks";
import { TaskList } from "@/components/tasks/TaskList";
import {
  WorkspaceLayout,
  type WorkspaceSpace,
  type WorkspaceUser,
} from "@/components/layout/WorkspaceLayout";

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [spaces, setSpaces] = useState<WorkspaceSpace[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authError, setAuthError] = useState("");
  const [spaceError, setSpaceError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const {
    tasks,
    setTasks,
    isLoadingTasks,
    taskError,
    isUpdatingTaskId,
    handleToggleTask,
    handleDeleteTask,
  } = useTasks(activeSpaceId);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [availableResources, setAvailableResources] = useState<
    {
      id: string;
      displayName: string;
      sizeBytes: number;
      mimeType: string;
    }[]
  >([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [quickAddError, setQuickAddError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const result = await apiRequest<{
          status: string;
          data: { user: WorkspaceUser };
        }>("/auth/me");

        if (cancelled) return;

        setUser(result.data.user);

        const spaceResult = await apiRequest<{
          status: string;
          data: { spaces: WorkspaceSpace[] };
        }>("/spaces");

        if (cancelled) return;

        setSpaces(spaceResult.data.spaces);

        const defaultSpace = spaceResult.data.spaces.find(
          (space) => space.isDefault,
        );

        setActiveSpaceId(
          defaultSpace?._id ?? spaceResult.data.spaces[0]?._id ?? "",
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

        setAuthError(
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

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await apiRequest("/auth/logout", { method: "POST" });
      router.replace("/auth/login");
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Unable to log out. Please try again.",
      );
      setIsLoggingOut(false);
    }
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newTaskTitle.trim();

    if (!title) {
      setQuickAddError("Task title is required.");
      return;
    }

    if (!activeSpaceId) {
      setQuickAddError("Please select a space before creating a task.");
      return;
    }

    setQuickAddError("");
    setIsCreatingTask(true);

    try {
      const response = await apiRequest<{
        status: string;
        data: { task: Task };
      }>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          spaceId: activeSpaceId,
          priority: newTaskPriority,
        }),
      });

      for (const resourceId of selectedResourceIds) {
        await apiRequest(
          `/resources/${encodeURIComponent(resourceId)}/attachments`,
          {
            method: "POST",
            body: JSON.stringify({
              targetType: "task",
              targetId: response.data.task._id,
            }),
          },
        );
      }

setTasks((currentTasks) => [response.data.task, ...currentTasks]);

      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setSelectedResourceIds([]);
      setIsQuickAddOpen(false);
    } catch (error) {
      setQuickAddError(
        error instanceof Error ? error.message : "Unable to create the task.",
      );
    } finally {
      setIsCreatingTask(false);
    }
  }

  useEffect(() => {
    if (!isQuickAddOpen || !activeSpaceId) {
      setAvailableResources([]);
      setSelectedResourceIds([]);
      return;
    }

    let cancelled = false;

    async function loadAvailableResources() {
      setIsLoadingResources(true);

      try {
        const response = await apiRequest<{
          status: string;
          data: {
            resources: {
              id: string;
              displayName: string;
              sizeBytes: number;
              mimeType: string;
            }[];
          };
        }>(
          `/resources?spaceId=${encodeURIComponent(activeSpaceId)}`,
          { cache: "no-store" },
        );

        if (!cancelled) {
          setAvailableResources(response.data.resources);
        }
      } catch (error) {
        if (!cancelled) {
          setQuickAddError(
            error instanceof Error
              ? error.message
              : "Unable to load resources.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingResources(false);
        }
      }
    }

    void loadAvailableResources();

    return () => {
      cancelled = true;
    };
  }, [isQuickAddOpen, activeSpaceId]);

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">Loading your workspace…</p>
      </main>
    );
  }

  if (!user || authError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
          <p role="alert" className="text-sm text-red-500">
            {authError || "Redirecting to login…"}
          </p>
          {authError && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
          )}
        </section>
      </main>
    );
  }

  const activeSpace = spaces.find((space) => space._id === activeSpaceId);

  return (
    <WorkspaceLayout
      user={user}
      spaces={spaces}
      activeSpaceId={activeSpaceId}
      onSpaceChange={setActiveSpaceId}
      isLoadingSpaces={isLoadingSpaces}
      spaceError={spaceError}
      isLoggingOut={isLoggingOut}
      logoutError={logoutError}
      onLogout={handleLogout}
      onQuickAdd={() => {
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
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-title"
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="quick-add-title" className="text-lg font-semibold">
                Create a task
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsQuickAddOpen(false);
                  setNewTaskTitle("");
                }}
                aria-label="Close Quick Add"
                className="rounded-lg p-2 text-muted hover:bg-surface-secondary"
              >
                <X size={18} />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleCreateTask}>
              <div>
                <label
                  htmlFor="quick-add-task-title"
                  className="mb-2 block text-sm font-medium"
                >
                  Task title
                </label>
                <input
                  id="quick-add-task-title"
                  autoFocus
                  required
                  maxLength={200}
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  placeholder="What needs to get done?"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label
                  htmlFor="quick-add-task-priority"
                  className="mb-2 block text-sm font-medium"
                >
                  Priority
                </label>
                <select
                  id="quick-add-task-priority"
                  value={newTaskPriority}
                  onChange={(event) =>
                    setNewTaskPriority(
                      event.target.value as "low" | "medium" | "high" | "urgent",
                    )
                  }
                  className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm outline-none focus:border-accent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="quick-add-resources"
                  className="mb-2 block text-sm font-medium"
                >
                  Attach resources
                </label>

                {isLoadingResources ? (
                  <p className="text-sm text-muted">Loading resources…</p>
                ) : availableResources.length === 0 ? (
                  <p className="text-sm text-muted">
                    No available resources in this space. Upload files in the Resource Library first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <select
                      id="quick-add-resources"
                      multiple
                      value={selectedResourceIds}
                      onChange={(event) =>
                        setSelectedResourceIds(
                          Array.from(event.target.selectedOptions, (option) => option.value),
                        )
                      }
                      className="min-h-24 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm outline-none focus:border-accent"
                    >
                      {availableResources.map((resource) => (
                        <option key={resource.id} value={resource.id}>
                          {resource.displayName}
                        </option>
                      ))}
                    </select>

                    <p className="text-xs text-muted">
                      Hold Ctrl (Windows/Linux) or Command (Mac) to select multiple files.
                    </p>
                  </div>
                )}
              </div>

              {quickAddError && (
                <p role="alert" className="text-sm text-red-500">
                  {quickAddError}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    setNewTaskTitle("");
                  }}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60"
                >
                  {isCreatingTask ? "Creating…" : "Create task"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <main
        id="workspace-content"
        className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="mb-8">
          <p className="text-sm text-muted">Your workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">My Day</h1>
          <p className="mt-2 text-sm text-muted">
            Welcome back, {user.name.split(" ")[0]}. Here’s your space to focus on
            what matters.
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Your tasks</h2>
              <p className="mt-1 text-sm text-muted">
                Tasks in {spaces.find((space) => space._id === activeSpaceId)?.name ?? "your current space"}.
              </p>
            </div>

            <div className="rounded-xl bg-surface-secondary px-3 py-2 text-sm">
              <span className="font-semibold">
                {tasks.filter((task) => task.status === "done").length}
              </span>
              <span className="text-muted">
                {" "}of {tasks.filter((task) => task.status !== "cancelled").length}{" "}
                completed
              </span>
            </div>
          </div>

          {isLoadingTasks ? (
            <div className="py-12 text-center text-sm text-muted">
              Loading your tasks…
            </div>
          ) : taskError ? (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-sm text-red-500">{taskError}</p>
            </div>
          ) : (
            <div className="mt-6 divide-y divide-border">
              <TaskList
                tasks={tasks}
                isUpdatingTaskId={isUpdatingTaskId}
                onToggleTask={(task) => void handleToggleTask(task)}
                onDeleteTask={(task) => void handleDeleteTask(task)}
                onAddTask={() => setIsQuickAddOpen(true)}
                activeSpaceId={activeSpaceId}
              />
            </div>
          )}
        </section>
      </main>
    </WorkspaceLayout>
  );
}