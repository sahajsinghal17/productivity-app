
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Upload, Download, Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import {
  WorkspaceLayout,
  type WorkspaceSpace,
  type WorkspaceUser,
} from "@/components/layout/WorkspaceLayout";

type Resource = {
  id: string;
  homeSpaceId: string;
  displayName: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  status: "available" | "trashed";
  createdAt: string;
  updatedAt: string;
};

type SpacesResponse = {
  status: string;
  data: { spaces: WorkspaceSpace[] };
};

type ResourcesResponse = {
  status: string;
  data: {
    resources: Resource[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourcesPage() {
  const router = useRouter();

  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [spaces, setSpaces] = useState<WorkspaceSpace[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [renamingResourceId, setRenamingResourceId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load the authenticated user and available spaces.
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

  // Load resources whenever the active space changes.
  useEffect(() => {
    let cancelled = false;

    if (!user || !activeSpaceId) {
      setResources([]);
      setIsLoadingResources(false);
      return () => {
        cancelled = true;
      };
    }

    async function loadResources() {
      setIsLoadingResources(true);
      setWorkspaceError("");

      try {
        const response = await apiRequest<ResourcesResponse>(
          `/resources?spaceId=${encodeURIComponent(activeSpaceId)}`,
        );

        if (!cancelled) {
          setResources(response.data.resources);
        }
      } catch (error) {
        if (!cancelled) {
          setWorkspaceError(
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

    void loadResources();

    return () => {
      cancelled = true;
    };
  }, [user, activeSpaceId]);


    async function handleTrash(resourceId: string) {
    const confirmed = window.confirm(
        "Move this resource to Trash? You can restore it later.",
    );

    if (!confirmed) return;

    try {
        await apiRequest(
        `/resources/${encodeURIComponent(resourceId)}`,
        { method: "DELETE" },
        );

        setResources((current) =>
        current.filter((resource) => resource.id !== resourceId),
        );

        if (renamingResourceId === resourceId) {
        setRenamingResourceId(null);
        setRenameValue("");
        }

        setWorkspaceError("");
    } catch (error) {
        setWorkspaceError(
        error instanceof Error
            ? error.message
            : "Unable to move resource to Trash.",
        );
    }
    }


  async function handleRename(resourceId: string) {
    const displayName = renameValue.trim();

    if (!displayName) {
        setWorkspaceError("Resource name cannot be empty.");
        return;
    }

    try {
        const response = await apiRequest<{
        status: string;
        data: { resource: Resource };
        }>(`/resources/${encodeURIComponent(resourceId)}`, {
        method: "PATCH",
        body: JSON.stringify({ displayName }),
        });

        setResources((current) =>
        current.map((resource) =>
            resource.id === resourceId
            ? { ...resource, ...response.data.resource, id: resourceId }
            : resource,
        ),
        );

        setRenamingResourceId(null);
        setRenameValue("");
        setWorkspaceError("");
    } catch (error) {
        setWorkspaceError(
        error instanceof Error ? error.message : "Unable to rename resource.",
        );
    }
  }


  async function handleDownload(resourceId: string) {
    try {
        const response = await apiRequest<{
        status: string;
        data: {
            resourceId: string;
            downloadUrl: string;
            expiresInSeconds: number;
        };
        }>(`/resources/${encodeURIComponent(resourceId)}/download-url`, {
        method: "POST",
        });

        const link = document.createElement("a");
        link.href = response.data.downloadUrl;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        setWorkspaceError(
        error instanceof Error
            ? error.message
            : "Unable to download this file.",
        );
    }
  }


  async function handleUpload() {
    if (!selectedFile || !activeSpaceId || isUploading) return;

    setIsUploading(true);
    setUploadError("");

    try {
      const intent = await apiRequest<{
        status: string;
        data: {
          resource: { id: string };
          upload: {
            url: string;
            method: "PUT";
            headers: Record<string, string>;
            expiresInSeconds: number;
          };
        };
      }>("/resources/upload-intent", {
        method: "POST",
        body: JSON.stringify({
          displayName: selectedFile.name,
          originalFilename: selectedFile.name,
          mimeType: selectedFile.type || "application/octet-stream",
          sizeBytes: selectedFile.size,
          homeSpaceId: activeSpaceId,
        }),
      });

      const uploadResponse = await fetch(intent.data.upload.url, {
        method: intent.data.upload.method,
        headers: intent.data.upload.headers,
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `File upload failed (HTTP ${uploadResponse.status}).`,
        );
      }

      await apiRequest(
        `/resources/${encodeURIComponent(intent.data.resource.id)}/complete`,
        { method: "POST" },
      );

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      const refreshed = await apiRequest<ResourcesResponse>(
        `/resources?spaceId=${encodeURIComponent(activeSpaceId)}`,
      );

      setResources(refreshed.data.resources);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Unable to upload this file.",
      );
    } finally {
      setIsUploading(false);
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
    >
      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Resource Library
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Store, organize, and attach files to your tasks and projects.
            </p>
          </div>
        </header>

        {workspaceError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            {workspaceError}
          </p>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                All resources
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {resources.length} {resources.length === 1 ? "file" : "files"} in this space
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeSpaceId || isUploading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Upload file
            </button>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setUploadError("");
              }}
            />
          </div>

          {selectedFile && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  disabled={isUploading}
                  className="text-sm text-slate-500 hover:text-slate-900 disabled:opacity-50 dark:hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleUpload()}
                  disabled={isUploading || !selectedFile}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? "Uploading…" : "Start upload"}
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <p
              role="alert"
              className="px-5 py-3 text-sm text-red-600 dark:text-red-400"
            >
              {uploadError}
            </p>
          )}

          {isLoadingResources ? (
            <div className="px-5 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading resources…
            </div>
          ) : resources.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <FileUp className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-3 font-medium text-slate-900 dark:text-white">
                No resources yet
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Uploaded files will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                    <FileUp className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    
                    {renamingResourceId === resource.id ? (
                    <form
                        onSubmit={(event) => {
                        event.preventDefault();
                        void handleRename(resource.id);
                        }}
                        className="flex flex-wrap items-center gap-2"
                    >
                        <input
                        autoFocus
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        maxLength={200}
                        aria-label="Resource name"
                        className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        <button
                        type="submit"
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                        Save
                        </button>

                        <button
                        type="button"
                        onClick={() => {
                            setRenamingResourceId(null);
                            setRenameValue("");
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                        Cancel
                        </button>
                    </form>
                    ) : (
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {resource.displayName}
                    </p>
                    )}

                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {resource.originalFilename} · {resource.mimeType}
                    </p>
                  </div>

                  
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(resource.sizeBytes)}
                    </span>

                    <button
                        type="button"
                        onClick={() => void handleDownload(resource.id)}
                        aria-label={`Download ${resource.displayName}`}
                        title="Download file"
                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                        >
                        <Download className="h-4 w-4" />
                    </button>


                    <button
                    type="button"
                    onClick={() => {
                        setRenamingResourceId(resource.id);
                        setRenameValue(resource.displayName);
                        setWorkspaceError("");
                    }}
                    aria-label={`Rename ${resource.displayName}`}
                    title="Rename file"
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                    >
                    <Pencil className="h-4 w-4" />
                    </button>


                    <button
                    type="button"
                    onClick={() => void handleTrash(resource.id)}
                    aria-label={`Move ${resource.displayName} to Trash`}
                    title="Move to Trash"
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                    <Trash2 className="h-4 w-4" />
                    </button>

                    

                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </WorkspaceLayout>
  );
}
