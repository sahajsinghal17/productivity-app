"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FolderKanban,
  Goal,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  X,
  FileUp,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

export type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
};

export type WorkspaceSpace = {
  _id: string;
  name: string;
  isDefault: boolean;
};

type WorkspaceLayoutProps = {
  user: WorkspaceUser;
  spaces: WorkspaceSpace[];
  activeSpaceId: string;
  onSpaceChange: (spaceId: string) => void;
  isLoadingSpaces: boolean;
  spaceError: string;
  isLoggingOut: boolean;
  logoutError: string;
  onLogout: () => void;
  children: ReactNode;
  onQuickAdd?: () => void;
  onSpaceCreated?: (space: WorkspaceSpace) => void;
};

const navigation = [
  { label: "My Day", href: "/", icon: CheckSquare },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Resources", href: "/resources", icon: FileUp },
  { label: "Goals", href: "/goals", icon: Goal },
];

export function WorkspaceLayout({
  user,
  spaces,
  activeSpaceId,
  onSpaceChange,
  isLoadingSpaces,
  spaceError,
  isLoggingOut,
  logoutError,
  onLogout,
  children,
  onQuickAdd,
  onSpaceCreated,
}: WorkspaceLayoutProps) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [createSpaceError, setCreateSpaceError] = useState("");
  const activeSpace = spaces.find((space) => space._id === activeSpaceId);

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

        onSpaceCreated?.(response.data.space);
        setNewSpaceName("");
        setIsCreateSpaceOpen(false);
    } catch (error) {
        setCreateSpaceError(
        error instanceof Error ? error.message : "Unable to create space.",
        );
    } finally {
        setIsCreatingSpace(false);
    }
  }

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
            <span className="font-semibold tracking-tight">Productivity</span>
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
              onChange={(event) => onSpaceChange(event.target.value)}
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

        <button
            type="button"
            onClick={() => {
                setCreateSpaceError("");
                setNewSpaceName("");
                setIsCreateSpaceOpen(true);
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
            <Plus className="h-4 w-4" />
            Create space
        </button>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 p-3">
          <p className="px-3 pb-2 pt-3 text-xs font-medium uppercase tracking-wider text-muted">
            Workspace
          </p>

          {navigation.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={label}
                href={href}
                onClick={() => setIsMobileNavOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-accent/10 font-semibold text-accent"
                    : "text-muted hover:bg-surface-secondary hover:text-foreground"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
                {isActive && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}

          <Link
            href="/trash"
            onClick={() => setIsMobileNavOpen(false)}
            aria-current={pathname === "/trash" ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              pathname === "/trash"
                ? "bg-accent/10 font-semibold text-accent"
                : "text-muted hover:bg-surface-secondary hover:text-foreground"
            }`}
          >
            <Archive size={18} strokeWidth={1.8} />
            Trash
            {pathname === "/trash" && (
              <span className="ml-auto h-2 w-2 rounded-full bg-accent" />
            )}
          </Link>

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
              onClick={onLogout}
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
            {onQuickAdd && (
              <button
                type="button"
                onClick={onQuickAdd}
                className="flex items-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                <span className="text-lg leading-none">+</span>
                <span className="hidden sm:inline">Quick add</span>
              </button>
            )}
          </div>
        </header>

        {isCreateSpaceOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-space-title"
                className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
                >
                <div className="mb-5 flex items-center justify-between">
                    <h2 id="create-space-title" className="text-lg font-semibold">
                    Create a space
                    </h2>
                    <button
                    type="button"
                    aria-label="Close dialog"
                    onClick={() => setIsCreateSpaceOpen(false)}
                    disabled={isCreatingSpace}
                    className="rounded-lg p-2 text-muted hover:bg-surface-secondary"
                    >
                    <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleCreateSpace}>
                    <label
                    htmlFor="new-space-name"
                    className="mb-2 block text-sm font-medium"
                    >
                    Space name
                    </label>
                    <input
                    id="new-space-name"
                    autoFocus
                    required
                    maxLength={100}
                    value={newSpaceName}
                    onChange={(event) => setNewSpaceName(event.target.value)}
                    placeholder="e.g. Study, Personal, Work"
                    className="w-full rounded-xl border border-border bg-surface-secondary px-3 py-2.5 text-sm outline-none focus:border-accent"
                    />

                    {createSpaceError && (
                    <p role="alert" className="mt-2 text-sm text-red-500">
                        {createSpaceError}
                    </p>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setIsCreateSpaceOpen(false)}
                        disabled={isCreatingSpace}
                        className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-surface-secondary disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isCreatingSpace || !newSpaceName.trim()}
                        className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                    >
                        {isCreatingSpace ? "Creating…" : "Create space"}
                    </button>
                    </div>
                </form>
                </div>
            </div>
        )}

        {children}
      </div>
    </div>
  );
}
