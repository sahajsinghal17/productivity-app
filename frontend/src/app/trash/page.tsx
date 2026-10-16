
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { Task } from "@/types/task";
import {
  WorkspaceLayout,
  type WorkspaceSpace,
  type WorkspaceUser,
} from "@/components/layout/WorkspaceLayout";

type DeletedTask = Task & {
  deletedAt?: string | null;
};

type TrashResponse = {
  status: string;
  data: { tasks: DeletedTask[] };
};

type SpacesResponse = {
  status: string;
  data: { spaces: WorkspaceSpace[] };
};

type DeletedGoal = {
  _id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "on_hold" | "cancelled";
  color: string;
  spaceId: string;
  deletedAt?: string | null;
  updatedAt: string;
};

type GoalsTrashResponse = {
  status: string;
  data: { goals: DeletedGoal[] };
};

export default function TrashPage() {
  const router = useRouter();

  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [spaces, setSpaces] = useState<WorkspaceSpace[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const [tasks, setTasks] = useState<DeletedTask[]>([]);
  const [goals, setGoals] = useState<DeletedGoal[]>([]);
  const [busyGoalId, setBusyGoalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

  const isBusy = busyTaskId !== null || isEmptyingTrash;

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
          defaultSpace?._id ??
            spacesResponse.data.spaces[0]?._id ??
            "",
        );
      } catch (err) {
        if (cancelled) return;

        if (
          err instanceof Error &&
          err.message.toLowerCase().includes("authenticated")
        ) {
          router.replace("/auth/login");
          return;
        }

        setError(
          err instanceof Error
            ? err.message
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

  const loadTrash = useCallback(async () => {
    if (!activeSpaceId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [tasksResult, goalsResult] = await Promise.allSettled([
      apiRequest<TrashResponse>(
        `/tasks/trash?spaceId=${encodeURIComponent(activeSpaceId)}`,
        { cache: "no-store" },
      ),
      apiRequest<GoalsTrashResponse>(
        `/goals/trash?spaceId=${encodeURIComponent(activeSpaceId)}`,
        { cache: "no-store" },
      ),
      ]);

      if (tasksResult.status === "fulfilled") {
        setTasks(tasksResult.value.data.tasks);
      } else {
        throw tasksResult.reason;
      }

      if (goalsResult.status === "fulfilled") {
        setGoals(goalsResult.value.data.goals);
      } else {
        throw goalsResult.reason;
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("authenticated")
      ) {
        router.replace("/auth/login");
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load deleted tasks.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeSpaceId, router]);

  useEffect(() => {
    if (!isCheckingAuth && activeSpaceId) {
      void loadTrash();
    }
  }, [isCheckingAuth, activeSpaceId, loadTrash]);

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await apiRequest("/auth/logout", { method: "POST" });
      router.replace("/auth/login");
    } catch (err) {
      setLogoutError(
        err instanceof Error ? err.message : "Unable to log out.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleRestore(task: DeletedTask) {
    setBusyTaskId(task._id);
    setError("");

    try {
      await apiRequest(`/tasks/${task._id}/restore`, {
        method: "PATCH",
      });

      setTasks((current) =>
        current.filter((item) => item._id !== task._id),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to restore this task.",
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handlePermanentDelete(task: DeletedTask) {
    const confirmed = window.confirm(
      `Permanently delete "${task.title}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setBusyTaskId(task._id);
    setError("");

    try {
      await apiRequest(`/tasks/${task._id}/permanent`, {
        method: "DELETE",
      });

      setTasks((current) =>
        current.filter((item) => item._id !== task._id),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to permanently delete this task.",
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleRestoreGoal(goalId: string) {
    setBusyGoalId(goalId);
    setError("");

    try {
      await apiRequest(`/goals/${goalId}/restore`, {
        method: "POST",
      });
      await loadTrash();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to restore goal.",
      );
    } finally {
      setBusyGoalId(null);
    }
  }

  async function handlePermanentDeleteGoal(goalId: string) {
    const confirmed = window.confirm(
      "Permanently delete this goal? This action cannot be undone.",
    );

    if (!confirmed) return;

    setBusyGoalId(goalId);
    setError("");

    try {
      await apiRequest(`/goals/${goalId}/permanent`, {
        method: "DELETE",
      });
      await loadTrash();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to permanently delete goal.",
      );
    } finally {
      setBusyGoalId(null);
    }
  }


  async function handleEmptyTrash() {
    if (tasks.length === 0) return;

    const confirmed = window.confirm(
      `Permanently delete all ${tasks.length} tasks in this space's Trash? This cannot be undone.`,
    );

    if (!confirmed) return;

    setIsEmptyingTrash(true);
    setError("");

    try {
      for (const task of tasks) {
        await apiRequest(`/tasks/${task._id}/permanent`, {
          method: "DELETE",
        });
      }

      setTasks([]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Some tasks could not be permanently deleted. Refresh to check the remaining items.",
      );

      await loadTrash();
    } finally {
      setIsEmptyingTrash(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted">Loading your workspace…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="max-w-md text-center">
          <p className="text-sm text-red-500">
            {error || "Unable to load your workspace."}
          </p>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-secondary"
          >
            Back to My Day
          </button>
        </div>
      </main>
    );
  }

  const activeSpace = spaces.find(
    (space) => space._id === activeSpaceId,
  );

  return (
    <WorkspaceLayout
      user={user}
      spaces={spaces}
      activeSpaceId={activeSpaceId}
      onSpaceChange={setActiveSpaceId}
      isLoadingSpaces={isLoadingSpaces}
      spaceError={error && spaces.length === 0 ? error : ""}
      isLoggingOut={isLoggingOut}
      logoutError={logoutError}
      onLogout={handleLogout}
      onQuickAdd={() => router.push("/")}
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
      <main
        id="workspace-content"
        className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:py-10"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Your workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Trash
            </h1>
            <p className="mt-2 text-sm text-muted">
              Deleted tasks and goals from {activeSpace?.name ?? "your space"}.
              Restore them or permanently remove them.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleEmptyTrash()}
            disabled={tasks.length === 0 || isBusy || isLoading}
            className="rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Empty Trash
          </button>
        </div>

        {error && spaces.length > 0 && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4"
          >
            <p className="text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => void loadTrash()}
              className="mt-3 text-sm font-medium text-foreground underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-semibold">Deleted tasks</h2>
              <p className="mt-1 text-sm text-muted">
                {tasks.length + goals.length}{" "}
                {tasks.length} {tasks.length === 1 ? "item" : "items"}
              </p>
            </div>
            <Trash2 size={20} className="text-muted" />
          </div>

          {isLoading || isLoadingSpaces ? (
            <p className="py-12 text-center text-sm text-muted">
              Loading Trash…
            </p>
          ) : tasks.length === 0 && goals.length===0? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-secondary text-muted">
                <Trash2 size={22} />
              </div>
              <h3 className="text-sm font-semibold">Trash is empty</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                Deleted tasks will appear here. You can restore them or
                permanently delete them from this page.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tasks.map((task) => (
                <article
                  key={task._id}
                  className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-medium">
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="rounded-md bg-surface-secondary px-2 py-1">
                        {task.priority.charAt(0).toUpperCase() +
                          task.priority.slice(1)}{" "}
                        priority
                      </span>

                      {task.deletedAt && (
                        <span>
                          Deleted{" "}
                          {new Date(task.deletedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRestore(task)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-secondary disabled:cursor-wait disabled:opacity-50"
                    >
                      <RotateCcw size={15} />
                      Restore
                    </button>

                    <button
                      type="button"
                      onClick={() => void handlePermanentDelete(task)}
                      disabled={isBusy}
                      aria-label={`Permanently delete ${task.title}`}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      <span className="hidden sm:inline">
                        Delete forever
                      </span>
                      <span className="sm:hidden">Delete</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-semibold">Deleted goals</h2>
              <p className="mt-1 text-sm text-muted">
                {goals.length} {goals.length === 1 ? "goal" : "goals"}
              </p>
            </div>
            <Trash2 size={20} className="text-muted" />
          </div>

          {goals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No deleted goals in this space.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {goals.map((goal) => (
                <article
                  key={goal._id}
                  className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `${goal.color || "#6366f1"}18`,
                      color: goal.color || "#6366f1",
                    }}
                  >
                    <Trash2 size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-medium">{goal.name}</h3>
                    {goal.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted">
                        {goal.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="rounded-md bg-surface-secondary px-2 py-1">
                        Goal · {goal.status.replace("_", " ")}
                      </span>
                      {goal.deletedAt && (
                        <span>
                          Deleted {new Date(goal.deletedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRestoreGoal(goal._id)}
                      disabled={isBusy || busyGoalId !== null}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-secondary disabled:cursor-wait disabled:opacity-50"
                    >
                      <RotateCcw size={15} />
                      Restore
                    </button>

                    <button
                      type="button"
                      onClick={() => void handlePermanentDeleteGoal(goal._id)}
                      disabled={isBusy || busyGoalId !== null}
                      aria-label={`Permanently delete goal ${goal.name}`}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      <span className="hidden sm:inline">Delete forever</span>
                      <span className="sm:hidden">Delete</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </WorkspaceLayout>
  );
}
