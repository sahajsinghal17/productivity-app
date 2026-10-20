"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  Search,
  CalendarDays,
  X,
  CircleAlert,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import {
  WorkspaceLayout,
  type WorkspaceSpace,
  type WorkspaceUser,
} from "@/components/layout/WorkspaceLayout";
import { ResourceAttachments } from "@/components/resources/ResourceAttachments";

type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

type Project = {
  _id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  icon: string;
  spaceId: string;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectsResponse = {
  status: string;
  data: {
    projects: Project[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type ProjectResponse = {
  status: string;
  data: { project: Project };
};

type SpacesResponse = {
  status: string;
  data: { spaces: WorkspaceSpace[] };
};

const statuses: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All projects" },
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusStyles: Record<ProjectStatus, string> = {
  planning:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  active:
    "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  on_hold:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled:
    "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

function formatStatus(status: ProjectStatus): string {
  return status.replace("_", " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

function formatDate(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProjectsPage() {
  const router = useRouter();

  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [spaces, setSpaces] = useState<WorkspaceSpace[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    ProjectStatus | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatus, setProjectStatus] =
    useState<ProjectStatus>("planning");
  const [projectColor, setProjectColor] = useState("#6366f1");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectDueDate, setProjectDueDate] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [createSpaceError, setCreateSpaceError] = useState("");

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

  const loadProjects = useCallback(async () => {
    if (!activeSpaceId) {
      setProjects([]);
      setIsLoadingProjects(false);
      return;
    }

    setIsLoadingProjects(true);
    setProjectError("");

    try {
      const allProjects: Project[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const query = new URLSearchParams({
          spaceId: activeSpaceId,
          page: String(page),
          limit: "100",
        });

        if (statusFilter !== "all") {
          query.set("status", statusFilter);
        }

        const response = await apiRequest<ProjectsResponse>(
          `/projects?${query.toString()}`,
          { cache: "no-store" },
        );

        allProjects.push(...response.data.projects);
        totalPages = response.data.pagination.totalPages;
        page += 1;
      } while (page <= totalPages);

      setProjects(allProjects);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("authenticated")
      ) {
        router.replace("/auth/login");
        return;
      }

      setProjectError(
        error instanceof Error
          ? error.message
          : "Unable to load projects.",
      );
    } finally {
      setIsLoadingProjects(false);
    }
  }, [activeSpaceId, statusFilter, router]);

  useEffect(() => {
    if (!isCheckingAuth && activeSpaceId) {
      void loadProjects();
    } else if (!activeSpaceId && !isLoadingSpaces) {
      setProjects([]);
      setIsLoadingProjects(false);
    }
  }, [isCheckingAuth, activeSpaceId, isLoadingSpaces, loadProjects]);

  const visibleProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return projects;

    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query),
    );
  }, [projects, searchQuery]);

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

  function resetCreateForm() {
    setProjectName("");
    setProjectDescription("");
    setProjectStatus("planning");
    setProjectColor("#6366f1");
    setProjectStartDate("");
    setProjectDueDate("");
    setCreateError("");
  }

  async function handleCreateProject(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!activeSpaceId) {
      setCreateError("Select a space before creating a project.");
      return;
    }

    if (
      projectStartDate &&
      projectDueDate &&
      projectDueDate < projectStartDate
    ) {
      setCreateError("Due date cannot be before the start date.");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      await apiRequest<ProjectResponse>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim(),
          status: projectStatus,
          color: projectColor,
          spaceId: activeSpaceId,
          startDate: projectStartDate || null,
          dueDate: projectDueDate || null,
        }),
      });

      setIsCreateOpen(false);
      resetCreateForm();
      await loadProjects();
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to create the project.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateSpace(
    event: React.FormEvent<HTMLFormElement>,
    ) {
    event.preventDefault();

    const name = newSpaceName.trim();

    if (!name) {
        setCreateSpaceError("Space name is required.");
        return;
    }

    setIsCreatingSpace(true);
    setCreateSpaceError("");

    try {
        const response = await apiRequest<{
        status: string;
        data: { space: WorkspaceSpace };
        }>("/spaces", {
        method: "POST",
        body: JSON.stringify({ name }),
        });

        const createdSpace = response.data.space;

        setSpaces((currentSpaces) =>
        [...currentSpaces, createdSpace].sort(
            (a, b) =>
            Number(b.isDefault) - Number(a.isDefault) ||
            a.name.localeCompare(b.name),
        ),
        );

        setActiveSpaceId(createdSpace._id);
        setIsCreateSpaceOpen(false);
        setNewSpaceName("");
    } catch (error) {
        setCreateSpaceError(
        error instanceof Error ? error.message : "Unable to create space.",
        );
    } finally {
        setIsCreatingSpace(false);
    }
  }

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
        resetCreateForm();
        setIsCreateOpen(true);
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
              <FolderKanban className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Projects
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Organize your work and keep track of progress.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            disabled={!activeSpaceId}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            New project
          </button>
        </header>

        {(workspaceError || projectError) && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{workspaceError || projectError}</p>
          </div>
        )}

        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              aria-label="Search projects"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search projects…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {statuses.map((status) => (
              <button
                type="button"
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  statusFilter === status.value
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {visibleProjects.length}{" "}
            {visibleProjects.length === 1 ? "project" : "projects"}
          </p>
          {isLoadingProjects && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading…
            </p>
          )}
        </div>

        {isLoadingProjects && projects.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-52 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : visibleProjects.length === 0 ? (
          <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <FolderKanban className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
              {searchQuery.trim()
                ? "No matching projects"
                : statusFilter === "all"
                  ? "Your projects start here"
                  : `No ${formatStatus(statusFilter).toLowerCase()} projects`}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {searchQuery.trim()
                ? "Try another search term."
                : "Create a project to group related tasks and keep your work organized."}
            </p>
            {!searchQuery.trim() && statusFilter === "all" && (
              <button
                type="button"
                onClick={() => {
                  resetCreateForm();
                  setIsCreateOpen(true);
                }}
                disabled={!activeSpaceId}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Create your first project
              </button>
            )}
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project) => {
              const startDate = formatDate(project.startDate);
              const dueDate = formatDate(project.dueDate);

              return (
                <article
                  key={project._id}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div
                    className="h-1.5"
                    style={{ backgroundColor: project.color }}
                  />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${project.color}20`,
                          color: project.color,
                        }}
                      >
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[project.status]}`}
                      >
                        {formatStatus(project.status)}
                      </span>
                    </div>

                    <h2 className="mt-4 break-words text-lg font-semibold text-slate-900 dark:text-white">
                      {project.name}
                    </h2>

                    <p className="mt-2 min-h-10 whitespace-pre-wrap break-words text-sm leading-5 text-slate-500 dark:text-slate-400">
                      {project.description || "No description yet."}
                    </p>

                    {(startDate || dueDate) && (
                      <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                        {startDate && (
                          <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span>Starts {startDate}</span>
                          </p>
                        )}
                        {dueDate && (
                          <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span>Due {dueDate}</span>
                          </p>
                        )}
                      </div>
                    )}

                    <ResourceAttachments
                      targetType="project"
                      targetId={project._id}
                      activeSpaceId={activeSpaceId}
                    />
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isCreating
            ) {
              setIsCreateOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
            className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2
                  id="create-project-title"
                  className="text-lg font-semibold text-slate-900 dark:text-white"
                >
                  Create a project
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Give your project a name and a few details.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label
                  htmlFor="project-name"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Project name
                </label>
                <input
                  id="project-name"
                  required
                  autoFocus
                  maxLength={120}
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="e.g. Portfolio website"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="project-description"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Description <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="project-description"
                  maxLength={5000}
                  rows={3}
                  value={projectDescription}
                  onChange={(event) =>
                    setProjectDescription(event.target.value)
                  }
                  placeholder="What is this project about?"
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="project-status"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Status
                  </label>
                  <select
                    id="project-status"
                    value={projectStatus}
                    onChange={(event) =>
                      setProjectStatus(event.target.value as ProjectStatus)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {statuses
                      .filter((status) => status.value !== "all")
                      .map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="project-color"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Project color
                  </label>
                  <div className="flex h-10 items-center gap-3 rounded-lg border border-slate-300 px-3 dark:border-slate-700">
                    <input
                      id="project-color"
                      type="color"
                      value={projectColor}
                      onChange={(event) => setProjectColor(event.target.value)}
                      className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {projectColor.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="project-start-date"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Start date <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="project-start-date"
                    type="date"
                    value={projectStartDate}
                    max={projectDueDate || undefined}
                    onChange={(event) =>
                      setProjectStartDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="project-due-date"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Due date <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="project-due-date"
                    type="date"
                    value={projectDueDate}
                    min={projectStartDate || undefined}
                    onChange={(event) =>
                      setProjectDueDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {createError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {createError}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !activeSpaceId}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? "Creating…" : "Create project"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </WorkspaceLayout>
  );
}