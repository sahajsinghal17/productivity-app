
"use client";

import { CheckSquare, Trash2 } from "lucide-react";
import type { Task } from "@/types/task";
import { ResourceAttachments } from "@/components/resources/ResourceAttachments";

type TaskListProps = {
  tasks: Task[];
  isUpdatingTaskId: string | null;
  onToggleTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onAddTask: () => void;
  activeSpaceId: string;
};

export function TaskList({
  tasks,
  isUpdatingTaskId,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  activeSpaceId,
}: TaskListProps) {
  
    if (tasks.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <CheckSquare size={23} />
            </div>

            <h3 className="text-sm font-semibold">
                Nothing on your list yet
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                A fresh start. Add a task to capture what you want to get done today.
            </p>

            <button
                type="button"
                onClick={onAddTask}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
            Add task
            </button>
        </div>
    );
}


  return (
    <div>
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
            onClick={() => onToggleTask(task)}
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

            <ResourceAttachments
              targetType="task"
              targetId={task._id}
              activeSpaceId={activeSpaceId}
            />
          </div>

          <button
            type="button"
            aria-label={`Move "${task.title}" to Trash`}
            title="Move to Trash"
            onClick={() => onDeleteTask(task)}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
