
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDashed,
  Goal as GoalIcon,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import {
  WorkspaceLayout,
  type WorkspaceSpace,
  type WorkspaceUser,
} from "@/components/layout/WorkspaceLayout";

type GoalStatus = "active" | "completed" | "on_hold" | "cancelled";

type GoalItem = {
  _id: string;
  name: string;
  description: string;
  status: GoalStatus;
  color: string;
  spaceId: string;
  parentGoalId: string | null;
  projectIds: string[];
  startDate: string | null;
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type GoalProgress = {
  progress: number;
  totalContributions?: number;
  completedContributions?: number;
};

type GoalsResponse = {
  status: string;
  data: {
    goals: GoalItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type GoalProgressResponse = {
  status: string;
  data: {
    progress: GoalProgress;
  };
};

type GoalResponse = {
  status: string;
  data: {
    goal: GoalItem;
  };
};

const STATUS_OPTIONS: { value: GoalStatus | "all"; label: string }[] = [
  { value: "all", label: "All goals" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<GoalStatus, string> = {
  active:
    "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  completed:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  on_hold:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  cancelled:
    "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

function formatGoalDate(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatusLabel(status: GoalStatus): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label
    ?? status;
}


export default function GoalsPage() {
  const router = useRouter();

  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [spaces, setSpaces] = useState<WorkspaceSpace[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [progressByGoal, setProgressByGoal] = useState<
    Record<string, GoalProgress>
  >({});
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [goalsError, setGoalsError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<GoalItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [createError, setCreateError] = useState("");

  const [goalName, setGoalName] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalStatus, setGoalStatus] = useState<GoalStatus>("active");
  const [goalColor, setGoalColor] = useState("#6366f1");
  const [goalStartDate, setGoalStartDate] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [parentGoalId, setParentGoalId] = useState("");

  // Authenticate the user and load available spaces.
  useEffect(() => {
    let cancelled = false;

    async function initializeWorkspace() {
      setIsCheckingAuth(true);
      setIsLoadingSpaces(true);
      setWorkspaceError("");

      try {
        const userResponse = await apiRequest<{
          status: string;
          data: { user: WorkspaceUser };
        }>("/auth/me", { cache: "no-store" });

        if (cancelled) return;
        setUser(userResponse.data.user);

        const spacesResponse = await apiRequest<{
          status: string;
          data: { spaces: WorkspaceSpace[] };
        }>("/spaces", { cache: "no-store" });

        if (cancelled) return;

        const loadedSpaces = spacesResponse.data.spaces;
        setSpaces(loadedSpaces);

        const defaultSpace = loadedSpaces.find((space) => space.isDefault);
        setActiveSpaceId(defaultSpace?._id ?? loadedSpaces[0]?._id ?? "");
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error ? error.message : "Unable to load workspace.";

        if (
          message.toLowerCase().includes("authentication") ||
          message.toLowerCase().includes("unauthorized") ||
          message.toLowerCase().includes("log in")
        ) {
          router.replace("/auth/login");
          return;
        }

        setWorkspaceError(message);
      } finally {
        if (!cancelled) {
          setIsCheckingAuth(false);
          setIsLoadingSpaces(false);
        }
      }
    }

    void initializeWorkspace();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Fetch goals whenever the active space or status filter changes.
  const loadGoals = useCallback(async () => {
    if (!activeSpaceId) {
      setGoals([]);
      setProgressByGoal({});
      setIsLoadingGoals(false);
      return;
    }

    setIsLoadingGoals(true);
    setGoalsError("");

    try {
      const params = new URLSearchParams({
        spaceId: activeSpaceId,
        page: "1",
        limit: "100",
      });

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await apiRequest<GoalsResponse>(
        `/goals?${params.toString()}`,
        { cache: "no-store" },
      );

      setGoals(response.data.goals);

      // Load each goal's calculated progress independently.
      const progressEntries = await Promise.all(
        response.data.goals.map(async (goal) => {
          try {
            const progressResponse = await apiRequest<GoalProgressResponse>(
              `/goals/${goal._id}/progress`,
              { cache: "no-store" },
            );

            return [goal._id, progressResponse.data.progress] as const;
          } catch {
            return [
              goal._id,
              { progress: 0 } satisfies GoalProgress,
            ] as const;
          }
        }),
      );

      setProgressByGoal(Object.fromEntries(progressEntries));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load goals.";

      if (
        message.toLowerCase().includes("authentication") ||
        message.toLowerCase().includes("unauthorized") ||
        message.toLowerCase().includes("log in")
      ) {
        router.replace("/auth/login");
        return;
      }

      setGoalsError(message);
      setGoals([]);
      setProgressByGoal({});
    } finally {
      setIsLoadingGoals(false);
    }
  }, [activeSpaceId, statusFilter, router]);

  useEffect(() => {
    if (!isCheckingAuth && activeSpaceId) {
      void loadGoals();
    } else if (!activeSpaceId && !isLoadingSpaces) {
      setGoals([]);
      setProgressByGoal({});
      setIsLoadingGoals(false);
    }
  }, [isCheckingAuth, activeSpaceId, isLoadingSpaces, loadGoals]);

  const visibleGoals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return goals;

    return goals.filter(
      (goal) =>
        goal.name.toLowerCase().includes(query) ||
        goal.description.toLowerCase().includes(query),
    );
  }, [goals, searchQuery]);

  const goalStats = useMemo(() => {
    const active = goals.filter((goal) => goal.status === "active").length;
    const completed = goals.filter((goal) => goal.status === "completed").length;
    const onHold = goals.filter((goal) => goal.status === "on_hold").length;

    return { total: goals.length, active, completed, onHold };
  }, [goals]);

  async function handleDeleteGoal() {
    if (!deletingGoal) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
        await apiRequest(`/goals/${deletingGoal._id}`, {
        method: "DELETE",
        });

        setDeletingGoal(null);
        await loadGoals();
    } catch (error) {
        setDeleteError(
        error instanceof Error ? error.message : "Unable to delete goal.",
        );
    } finally {
        setIsDeleting(false);
    }
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

  function handleEditGoal(goal: GoalItem) {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setGoalDescription(goal.description);
    setGoalStatus(goal.status);
    setGoalColor(goal.color || "#6366f1");
    setGoalStartDate(
        goal.startDate ? goal.startDate.slice(0, 10) : "",
    );
    setGoalTargetDate(
        goal.targetDate ? goal.targetDate.slice(0, 10) : "",
    );
    setParentGoalId(goal.parentGoalId ?? "");
    setCreateError("");
    setIsCreateOpen(true);
  }

  function resetCreateForm() {
    setGoalName("");
    setGoalDescription("");
    setGoalStatus("active");
    setGoalColor("#6366f1");
    setGoalStartDate("");
    setGoalTargetDate("");
    setParentGoalId("");
    setCreateError("");
  }

  async function handleCreateGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeSpaceId) {
      setCreateError("Select a space before creating a goal.");
      return;
    }

    if (
      goalStartDate &&
      goalTargetDate &&
      goalTargetDate < goalStartDate
    ) {
      setCreateError("Target date cannot be before the start date.");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const payload = {
        name: goalName.trim(),
        description: goalDescription.trim(),
        status: goalStatus,
        color: goalColor,
        spaceId: activeSpaceId,
        parentGoalId: parentGoalId || null,
        startDate: goalStartDate || null,
        targetDate: goalTargetDate || null,
        };

        if (editingGoal) {
        await apiRequest<GoalResponse>(`/goals/${editingGoal._id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
        } else {
        await apiRequest<GoalResponse>("/goals", {
            method: "POST",
            body: JSON.stringify(payload),
        });
      }
      setIsCreateOpen(false);
      setEditingGoal(null);
      resetCreateForm();
      await loadGoals();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Unable to create goal.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function handleSpaceCreated(createdSpace: WorkspaceSpace) {
    setSpaces((current) =>
      [...current, createdSpace].sort(
        (a, b) =>
          Number(b.isDefault) - Number(a.isDefault) ||
          a.name.localeCompare(b.name),
      ),
    );
    setActiveSpaceId(createdSpace._id);
  }


  if (isCheckingAuth || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading your workspace…
        </div>
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
        resetCreateForm();
        setIsCreateOpen(true);
      }}
      onSpaceCreated={handleSpaceCreated}
    >
      <main className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-accent">
              Your workspace / Goals
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Goals
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Turn long-term ambitions into measurable progress, one step at a time.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Plus size={18} />
            New goal
          </button>
        </header>

        {goalsError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">{goalsError}</div>
            <button
              type="button"
              onClick={() => void loadGoals()}
              className="font-semibold underline underline-offset-4"
            >
              Retry
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Total goals",
              value: goalStats.total,
              icon: Target,
            },
            {
              label: "Active",
              value: goalStats.active,
              icon: CircleDashed,
            },
            {
              label: "Completed",
              value: goalStats.completed,
              icon: Check,
            },
            {
              label: "On hold",
              value: goalStats.onHold,
              icon: CalendarDays,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted sm:text-sm">
                  {label}
                </span>
                <Icon size={17} className="text-muted" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Your goals</h2>
              <p className="mt-1 text-sm text-muted">
                Track progress across your current space.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search goals…"
                  aria-label="Search goals"
                  className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent"
                />
              </div>

              <div className="relative sm:w-40">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as GoalStatus | "all")
                  }
                  aria-label="Filter goals by status"
                  className="w-full appearance-none rounded-xl border border-border bg-surface py-2.5 pl-3 pr-9 text-sm outline-none focus:border-accent"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            </div>
          </div>

          {isLoadingGoals ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-52 animate-pulse rounded-2xl border border-border bg-surface-secondary"
                />
              ))}
            </div>
          ) : visibleGoals.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <GoalIcon size={26} />
              </div>
              <h3 className="mt-5 text-base font-semibold">
                {searchQuery || statusFilter !== "all"
                  ? "No matching goals"
                  : "Start with a goal"}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                {searchQuery || statusFilter !== "all"
                  ? "Try another search or status filter."
                  : "Define something you want to achieve and connect it to your projects."}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <button
                  type="button"
                  onClick={() => {
                    resetCreateForm();
                    setIsCreateOpen(true);
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  <Plus size={17} />
                  Create your first goal
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleGoals.map((goal) => {
                const progress = progressByGoal[goal._id]?.progress ?? 0;
                const parent = goal.parentGoalId
                  ? goals.find((item) => item._id === goal.parentGoalId)
                  : undefined;

                return (
                  <article
                    key={goal._id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div
                      className="h-1.5 w-full"
                      style={{ backgroundColor: goal.color || "#6366f1" }}
                    />

                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: `${goal.color || "#6366f1"}18`,
                              color: goal.color || "#6366f1",
                            }}
                          >
                            <GoalIcon size={21} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="break-words font-semibold leading-6">
                              {goal.name}
                            </h3>
                            {parent && (
                              <p className="mt-1 truncate text-xs text-muted">
                                Part of {parent.name}
                              </p>
                            )}
                          </div>
                        </div>

                        
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[goal.status]}`}
                          >
                            {getStatusLabel(goal.status)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleEditGoal(goal)}
                            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
                            aria-label={`Edit ${goal.name}`}
                            title="Edit goal"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError("");
                              setDeletingGoal(goal);
                            }}
                            className="rounded-lg p-2 text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                            aria-label={`Delete ${goal.name}`}
                            title="Move to Trash"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                      </div>

                      {goal.description && (
                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">
                          {goal.description}
                        </p>
                      )}

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-muted">
                            Overall progress
                          </span>
                          <span className="text-sm font-semibold tabular-nums">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full bg-surface-secondary"
                          role="progressbar"
                          aria-label={`${goal.name} progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(progress)}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(0, progress))}%`,
                              backgroundColor: goal.color || "#6366f1",
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                        {goal.targetDate && (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={14} />
                            Target {formatGoalDate(goal.targetDate)}
                          </span>
                        )}
                        {goal.parentGoalId && !parent && (
                          <span className="inline-flex items-center gap-1.5">
                            <GoalIcon size={14} />
                            Sub-goal
                          </span>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-border pt-4 mt-5">
                        <span className="text-xs text-muted">
                          {goal.projectIds.length} linked{" "}
                          {goal.projectIds.length === 1 ? "project" : "projects"}
                        </span>
                        <span className="text-xs font-medium text-muted">
                          Updated {formatGoalDate(goal.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {isCreateOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isCreating) {
                setIsCreateOpen(false);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-goal-title"
              className="my-auto w-full max-w-xl rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:p-7"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="create-goal-title"
                    className="text-xl font-semibold tracking-tight"
                  >
                    {editingGoal ? "Edit goal" : "Create a goal"}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Set an outcome you want to work toward.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                  aria-label="Close create goal dialog"
                  className="rounded-lg p-2 text-muted hover:bg-surface-secondary disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {createError && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400"
                >
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateGoal} className="space-y-5">
                <div>
                  <label
                    htmlFor="goal-name"
                    className="mb-2 block text-sm font-medium"
                  >
                    Goal name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="goal-name"
                    required
                    maxLength={120}
                    autoFocus
                    value={goalName}
                    onChange={(event) => setGoalName(event.target.value)}
                    placeholder="e.g. Become a stronger programmer"
                    className="w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="goal-description"
                    className="mb-2 block text-sm font-medium"
                  >
                    Description
                  </label>
                  <textarea
                    id="goal-description"
                    rows={3}
                    maxLength={5000}
                    value={goalDescription}
                    onChange={(event) =>
                      setGoalDescription(event.target.value)
                    }
                    placeholder="What does success look like?"
                    className="w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-3 text-sm outline-none focus:border-accent"
                  />
                  <p className="mt-1 text-right text-xs text-muted">
                    {goalDescription.length}/5000
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="goal-status"
                      className="mb-2 block text-sm font-medium"
                    >
                      Status
                    </label>
                    <select
                      id="goal-status"
                      value={goalStatus}
                      onChange={(event) =>
                        setGoalStatus(event.target.value as GoalStatus)
                      }
                      className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm outline-none focus:border-accent"
                    >
                      {STATUS_OPTIONS.filter(
                        (option) => option.value !== "all",
                      ).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="goal-color"
                      className="mb-2 block text-sm font-medium"
                    >
                      Goal color
                    </label>
                    <div className="flex h-[46px] items-center gap-3 rounded-xl border border-border bg-surface px-3">
                      <input
                        id="goal-color"
                        type="color"
                        value={goalColor}
                        onChange={(event) => setGoalColor(event.target.value)}
                        aria-label="Choose goal color"
                        className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                      <span className="font-mono text-sm uppercase text-muted">
                        {goalColor}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="goal-parent"
                    className="mb-2 block text-sm font-medium"
                  >
                    Parent goal
                  </label>
                  <div className="relative">
                    <select
                      id="goal-parent"
                      value={parentGoalId}
                      onChange={(event) => setParentGoalId(event.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-surface px-3 py-3 pr-9 text-sm outline-none focus:border-accent"
                    >
                      <option value="">No parent — top-level goal</option>
                      {goals
                        .filter((goal) => goal.status !== "cancelled")
                        .map((goal) => (
                          <option key={goal._id} value={goal._id}>
                            {goal.name}
                          </option>
                        ))}
                    </select>
                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    You can organize goals into a hierarchy up to five levels deep.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="goal-start-date"
                      className="mb-2 block text-sm font-medium"
                    >
                      Start date
                    </label>
                    <input
                      id="goal-start-date"
                      type="date"
                      value={goalStartDate}
                      onChange={(event) => setGoalStartDate(event.target.value)}
                      max={goalTargetDate || undefined}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="goal-target-date"
                      className="mb-2 block text-sm font-medium"
                    >
                      Target date
                    </label>
                    <input
                      id="goal-target-date"
                      type="date"
                      value={goalTargetDate}
                      onChange={(event) => setGoalTargetDate(event.target.value)}
                      min={goalStartDate || undefined}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-secondary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !goalName.trim() || !activeSpaceId}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating && (
                      <LoaderCircle size={16} className="animate-spin" />
                    )}
                    {isCreating
                    ? editingGoal
                        ? "Saving..."
                        : "Creating..."
                    : editingGoal
                        ? "Save changes"
                        : "Create goal"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>

      
      {deletingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-goal-title"
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            >
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <AlertCircle size={21} />
                </div>

                <div className="min-w-0">
                <h2 id="delete-goal-title" className="text-lg font-semibold">
                    Move goal to Trash?
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                    Are you sure you want to move{" "}
                    <span className="font-medium text-foreground">
                    {deletingGoal.name}
                    </span>{" "}
                    to Trash? You can restore it later.
                </p>
                </div>
            </div>

            {deleteError && (
                <p className="mt-4 text-sm text-red-500" role="alert">
                {deleteError}
                </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
                <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                    setDeletingGoal(null);
                    setDeleteError("");
                }}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-surface-secondary disabled:opacity-50"
                >
                Cancel
                </button>

                <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDeleteGoal()}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                {isDeleting ? "Moving..." : "Move to Trash"}
                </button>
            </div>
            </div>
        </div>
      )}

    </WorkspaceLayout>
  );
}


