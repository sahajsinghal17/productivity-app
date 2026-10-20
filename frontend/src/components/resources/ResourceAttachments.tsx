"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Download, File, Link2, LoaderCircle, Unlink } from "lucide-react";
import { apiRequest } from "@/lib/api";

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

type ResourceAttachment = {
  attachmentId: string;
  targetSpaceId: string;
  resource: {
    _id: string;
    ownerId: string;
    homeSpaceId: string;
    displayName: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    status: "available" | "trashed";
    createdAt: string;
    updatedAt: string;
  };
};

type AttachmentsResponse = {
  status: string;
  data: {
    attachments: ResourceAttachment[];
  };
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

type ResourceAttachmentsProps = {
  targetType: "task" | "project";
  targetId: string;
  activeSpaceId: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResourceAttachments({
  targetType,
  targetId,
  activeSpaceId,
}: ResourceAttachmentsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [attachments, setAttachments] = useState<ResourceAttachment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [busyResourceId, setBusyResourceId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");

  useEffect(() => {
    if (!targetId) return;

    let cancelled = false;

    async function loadAttachments() {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiRequest<AttachmentsResponse>(
          `/resources/target/${targetType}/${encodeURIComponent(targetId)}/attachments`,
          { cache: "no-store" },
        );

        if (!cancelled) {
          console.log("Attachments API response:", response.data.attachments);
          setAttachments(response.data.attachments);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load attachments.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadAttachments();

    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  useEffect(() => {
    if (!isExpanded || !activeSpaceId) return;

    let cancelled = false;

    async function loadResources() {
      setIsLoadingResources(true);

      try {
        const response = await apiRequest<ResourcesResponse>(
          `/resources?spaceId=${encodeURIComponent(activeSpaceId)}`,
          { cache: "no-store" },
        );

        if (!cancelled) {
          setResources(
            response.data.resources.filter(
              (resource) => resource.status === "available",
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load Resource Library.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingResources(false);
      }
    }

    void loadResources();

    return () => {
      cancelled = true;
    };
  }, [isExpanded, activeSpaceId]);

  const attachedResourceIds = new Set(
    attachments.map((attachment) => attachment.resource._id),
  );

  const availableResources = resources.filter(
    (resource) => !attachedResourceIds.has(resource.id),
  );

  async function handleAttach() {
    if (!selectedResourceId) return;

    setBusyResourceId(selectedResourceId);
    setError("");

    try {
      await apiRequest(
        `/resources/${encodeURIComponent(selectedResourceId)}/attachments`,
        {
          method: "POST",
          body: JSON.stringify({ targetType, targetId }),
        },
      );

      const response = await apiRequest<AttachmentsResponse>(
        `/resources/target/${targetType}/${encodeURIComponent(targetId)}/attachments`,
        { cache: "no-store" },
      );

      setAttachments(response.data.attachments);
      setSelectedResourceId("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to attach this resource.",
      );
    } finally {
      setBusyResourceId(null);
    }
  }

  async function handleDownload(resourceId: string) {
    setBusyResourceId(resourceId);
    setError("");

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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to download this file.",
      );
    } finally {
      setBusyResourceId(null);
    }
  }

  async function handleDetach(attachment: ResourceAttachment) {
    const resourceId = attachment.resource._id;

    setBusyResourceId(resourceId);
    setError("");

    try {
      await apiRequest(
        `/resources/${encodeURIComponent(resourceId)}/attachments/${encodeURIComponent(attachment.attachmentId)}`,
        { method: "DELETE" },
      );

      setAttachments((current) =>
        current.filter(
          (item) => item.attachmentId !== attachment.attachmentId,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to detach this resource.",
      );
    } finally {
      setBusyResourceId(null);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        <Link2 className="h-4 w-4" />
        Attachments
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
          {attachments.length}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading attachments…
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No files attached yet.
            </p>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => {
                const resource = attachment.resource;
                const isBusy = busyResourceId === resource._id;

                return (
                  <div
                    key={attachment.attachmentId}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"
                  >
                    <File className="h-4 w-4 shrink-0 text-slate-500" />

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-slate-800 dark:text-slate-100">
                        {resource.displayName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(resource.sizeBytes)}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label={`Download ${resource.displayName}`}
                      title="Download"
                      disabled={isBusy}
                      onClick={() => void handleDownload(resource._id)}
                      className="rounded-md p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-700 dark:hover:text-white"
                    >
                      {isBusy ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      aria-label={`Detach ${resource.displayName}`}
                      title="Detach file"
                      disabled={isBusy}
                      onClick={() => void handleDetach(attachment)}
                      className="rounded-md p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                    >
                      <Unlink className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={selectedResourceId}
              onChange={(event) => setSelectedResourceId(event.target.value)}
              disabled={isLoadingResources || availableResources.length === 0}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">
                {isLoadingResources
                  ? "Loading Resource Library…"
                  : availableResources.length === 0
                    ? "No available resources to attach"
                    : "Choose a resource to attach"}
              </option>
              {availableResources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.displayName}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!selectedResourceId || busyResourceId !== null}
              onClick={() => void handleAttach()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyResourceId === selectedResourceId ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Attach
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
