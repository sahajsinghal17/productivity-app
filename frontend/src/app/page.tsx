"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FolderKanban,
  Goal,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
};

type Space = {
  _id: string;
  name: string;
  isDefault: boolean;
};

type Task = {
  _id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  spaceId: string;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My Day", icon: CheckSquare },
  { label: "Calendar", icon: CalendarDays },
  { label: "Projects", icon: FolderKanban },
  { label: "Goals", icon: Goal },
];

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [spaceError, setSpaceError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [isUpdatingTaskId, setIsUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const result = await apiRequest<{
          status: string;
          data: { user: User };
        }>("/auth/me");

        if (cancelled) return;

        setUser(result.data.user);

        const spaceResult = await apiRequest<{
          status: string;
          data: { spaces: Space[] };
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

  useEffect(() => {
    if (!activeSpaceId) {
      setTasks([]);
      return;
    }

    let isActive = true;

    async function loadTasks() {
      setIsLoadingTasks(true);
      setTaskError("");

      try {
        const response = await apiRequest<{
          status: string;
          data: { tasks: Task[] };
        }>(
          `/tasks?spaceId=${encodeURIComponent(activeSpaceId)}&parentTaskId=null&limit=100`,
          { cache: "no-store" },
        );

        if (isActive) {
          setTasks(response.data.tasks);
        }
      } catch (error) {
        if (isActive) {
          setTaskError(
            error instanceof Error ? error.message : "Unable to load tasks.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingTasks(false);
        }
      }
    }

    void loadTasks();

    return () => {
      isActive = false;
    };
  }, [activeSpaceId]);

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


  async function handleToggleTask(task: Task) {
    if (isUpdatingTaskId) return;

    const previousStatus = task.status;
    const nextStatus = previousStatus === "done" ? "todo" : "done";

    setIsUpdatingTaskId(task._id);
    setTaskError("");

    // Update the UI immediately.
    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask._id === task._id
          ? { ...currentTask, status: nextStatus }
          : currentTask,
      ),
    );

    try {
      await apiRequest<{ status: string; data: { task: Task } }>(
        `/tasks/${task._id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );
    } catch (error) {
      // Restore the previous status if the server rejects the update.
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask._id === task._id
            ? { ...currentTask, status: previousStatus }
            : currentTask,
        ),
      );

      setTaskError(
        error instanceof Error
          ? error.message
          : "Unable to update the task. Please try again.",
      );
    } finally {
      setIsUpdatingTaskId(null);
    }
  }

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
    <div className="min-h-screen bg-background text-foreground">
      {isMobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 md:translate-x-0 ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white">
              P
            </div>
            <span className="font-semibold tracking-tight">
              Productivity
            </span>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMobileNavOpen(false)}
            className="rounded-lg p-2 text-muted hover:bg-surface-secondary md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-border p-4">
          <label
            htmlFor="space-selector"
            className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted"
          >
            Your space
          </label>
          <div className="relative">
            <select
              id="space-selector"
              value={activeSpaceId}
              disabled={isLoadingSpaces || spaces.length === 0}
              onChange={(event) => setActiveSpaceId(event.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-surface-secondary px-3 py-3 pr-9 text-sm font-medium outline-none focus:border-accent disabled:opacity-60"
            >
              {isLoadingSpaces ? (
                <option value="">Loading spaces…</option>
              ) : spaces.length === 0 ? (
                <option value="">No spaces available</option>
              ) : (
                spaces.map((space) => (
                  <option key={space._id} value={space._id}>
                    {space.name}
                    {space.isDefault ? " · Default" : ""}
                  </option>
                ))
              )}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            />
          </div>
          {spaceError && (
            <p role="alert" className="mt-2 text-xs text-red-500">
              {spaceError}
            </p>
          )}
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 p-3">
          <p className="px-3 pb-2 pt-3 text-xs font-medium uppercase tracking-wider text-muted">
            Workspace
          </p>

          {navigation.map(({ label, icon: Icon }) => {
            const isActive = label === "My Day";

            return (
              <button
                key={label}
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-accent/10 font-semibold text-accent"
                    : "text-muted hover:bg-surface-secondary hover:text-foreground"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
                {label === "My Day" && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-accent" />
                )}
              </button>
            );
          })}

          <div className="px-3 pb-2 pt-7 text-xs font-medium uppercase tracking-wider text-muted">
            Personal
          </div>

          <button
            type="button"
            onClick={() => setIsMobileNavOpen(false)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-surface-secondary hover:text-foreground"
          >
            <Settings2 size={18} strokeWidth={1.8} />
            Settings
          </button>
        </nav>

        <div className="border-t border-border p-3">
          {logoutError && (
            <p role="alert" className="mb-3 px-2 text-xs text-red-500">
              {logoutError}
            </p>
          )}

          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-semibold">
              {user.name.trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <button
              type="button"
              aria-label="Log out"
              title="Log out"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-lg p-2 text-muted hover:bg-surface-secondary hover:text-foreground disabled:opacity-50"
            >
              <LogOut size={17} />
            </button>
          </div>
          {isLoggingOut && (
            <p className="px-2 pb-1 text-xs text-muted">Logging out…</p>
          )}
        </div>
      </aside>

      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setIsMobileNavOpen(true)}
              className="rounded-lg p-2 hover:bg-surface-secondary md:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-xs text-muted">Workspace</p>
              <p className="text-sm font-semibold">
                {activeSpace?.name ?? "My workspace"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Search"
              title="Search"
              className="rounded-xl border border-border p-2.5 text-muted hover:bg-surface-secondary"
            >
              <Search size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileNavOpen(false);
                document.getElementById("workspace-content")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
              className="flex items-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">Quick add</span>
            </button>
          </div>
        </header>

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
                  Tasks in {activeSpace?.name ?? "your current space"}.
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
            ) : tasks.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-border px-5 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <CheckSquare size={22} />
                </div>
                <h3 className="mt-4 text-base font-semibold">No tasks yet</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
                  This space is ready for your tasks. We’ll add task creation next.
                </p>
              </div>
            ) : (
              <div className="mt-6 divide-y divide-border">
                {tasks.map((task) => (
                  <div key={task._id} className="flex items-start gap-3 py-4">
                    <button
                      type="button"
                      aria-label={
                        task.status === "done"
                          ? `Reopen task: ${task.title}`
                          : `Complete task: ${task.title}`
                      }
                      title={task.status === "done" ? "Reopen task" : "Complete task"}
                      disabled={isUpdatingTaskId === task._id}
                      onClick={() => void handleToggleTask(task)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-wait disabled:opacity-60 ${
                        task.status === "done"
                          ? "border-accent bg-accent text-white"
                          : "border-border hover:border-accent"
                      }`}
                    >
                      {task.status === "done" && <CheckSquare size={13} />}
                    </button>


                    <div className="min-w-0 flex-1">
                      <p
                        className={`break-words text-sm font-medium ${
                          task.status === "done" ? "text-muted line-through" : ""
                        }`}
                      >
                        {task.title}
                      </p>

                      {task.description && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-1 text-xs ${
                            task.priority === "urgent"
                              ? "bg-red-500/10 text-red-500"
                              : task.priority === "high"
                                ? "bg-orange-500/10 text-orange-500"
                                : task.priority === "medium"
                                  ? "bg-accent/10 text-accent"
                                  : "bg-surface-secondary text-muted"
                          }`}
                        >
                          {task.priority.charAt(0).toUpperCase() +
                            task.priority.slice(1)}
                        </span>

                        {task.status === "in_progress" && (
                          <span className="text-xs text-muted">In progress</span>
                        )}

                        {task.status === "cancelled" && (
                          <span className="text-xs text-muted">Cancelled</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>


      </div>
    </div>
  );
}