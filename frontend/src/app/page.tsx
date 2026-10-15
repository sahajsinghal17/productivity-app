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
import type { Task } from "@/types/task";
import { useTasks } from "@/hooks/use-tasks";
import { TaskList } from "@/components/tasks/TaskList";

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

      setTasks((currentTasks) => [response.data.task, ...currentTasks]);
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setIsQuickAddOpen(false);
    } catch (error) {
      setQuickAddError(
        error instanceof Error ? error.message : "Unable to create the task.",
      );
    } finally {
      setIsCreatingTask(false);
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
                setQuickAddError("");
                setIsQuickAddOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">Quick add</span>
            </button>

          </div>
        </header>

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
              ) : (
                <div className="mt-6 divide-y divide-border">
                  <TaskList
                    tasks={tasks}
                    isUpdatingTaskId={isUpdatingTaskId}
                    onToggleTask={(task) => void handleToggleTask(task)}
                    onDeleteTask={(task) => void handleDeleteTask(task)}
                    onAddTask={() => setIsQuickAddOpen(true)}
                  />
                </div>
              )}

          </section>
        </main>


      </div>
    </div>
  );
}