"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button } from "@/components/ui/card";
import { DOMAIN_LABELS, ROLE_LABELS, TASK_STATUS_LABELS } from "@/lib/constants";

interface Task {
  id: string;
  title: string;
  domain: string;
  ownerRole: string;
  status: string;
  proposedByAi: boolean;
}

interface Blocker {
  id: string;
  title: string;
  description: string | null;
  domain: string;
  ownerRole: string;
  status: string;
  severity: string;
  escalationRoute: string | null;
}

export function TaskBlockerPanel({
  encounterId,
  onUpdated,
}: {
  encounterId: string;
  onUpdated: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [t, b] = await Promise.all([
      fetch(`/api/encounters/${encounterId}/tasks`).then((r) => r.json()),
      fetch(`/api/encounters/${encounterId}/blockers`).then((r) => r.json()),
    ]);
    setTasks(t.tasks ?? []);
    setBlockers(b.blockers ?? []);
    setLoading(false);
  }, [encounterId]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  function markPending(id: string, on: boolean) {
    setPending((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function completeTask(taskId: string) {
    setError(null);
    const previous = tasks;
    // Optimistic: flip the task to DONE locally so the UI moves it to the resolved column immediately.
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, status: "DONE" } : t))
    );
    markPending(taskId, true);

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });

    markPending(taskId, false);

    if (!res.ok) {
      // Roll back optimistic change and surface the error
      setTasks(previous);
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Failed to mark task as done. Check permissions or try again.");
      return;
    }

    onUpdated();
    await loadData();
  }

  async function resolveBlocker(blockerId: string) {
    setError(null);
    const previous = blockers;
    setBlockers((current) =>
      current.map((b) => (b.id === blockerId ? { ...b, status: "DONE" } : b))
    );
    markPending(blockerId, true);

    const res = await fetch(`/api/blockers/${blockerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE", notes: "Resolved by clinician" }),
    });

    markPending(blockerId, false);

    if (!res.ok) {
      setBlockers(previous);
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Failed to resolve blocker. Check permissions or try again.");
      return;
    }

    onUpdated();
    await loadData();
  }

  const activeTasks = tasks.filter((t) => t.status !== "DONE" && t.status !== "NOT_APPLICABLE");
  const resolvedTasks = tasks.filter((t) => t.status === "DONE" || t.status === "NOT_APPLICABLE");
  const activeBlockers = blockers.filter((b) => b.status !== "DONE");
  const resolvedBlockers = blockers.filter((b) => b.status === "DONE");

  function renderTask(t: Task, resolved = false) {
    const isPending = pending.has(t.id);
    return (
      <li
        key={t.id}
        className={`border rounded p-3 text-sm transition-opacity ${isPending ? "opacity-60" : ""}`}
        data-testid={resolved ? "task-resolved" : "task-active"}
      >
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="font-medium">{t.title}</div>
            <div className="text-xs text-slate-500">
              {DOMAIN_LABELS[t.domain]} · {ROLE_LABELS[t.ownerRole]}
              {t.proposedByAi && " · AI proposed"}
            </div>
          </div>
          <span className="text-xs">{TASK_STATUS_LABELS[t.status]}</span>
        </div>
        {!resolved && (
          <Button
            variant="ghost"
            className="mt-2 text-xs"
            data-testid="task-mark-done"
            onClick={() => completeTask(t.id)}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Mark done"}
          </Button>
        )}
      </li>
    );
  }

  function renderBlocker(b: Blocker, resolved = false) {
    const isPending = pending.has(b.id);
    return (
      <li
        key={b.id}
        className={`border rounded p-3 text-sm transition-opacity ${
          resolved ? "border-slate-200 bg-slate-50" : "border-red-200 bg-red-50"
        } ${isPending ? "opacity-60" : ""}`}
        data-testid={resolved ? "blocker-resolved" : "blocker-active"}
      >
        <div className={`font-medium ${resolved ? "text-slate-700" : "text-red-900"}`}>{b.title}</div>
        {b.description && (
          <div className={`text-xs mt-1 ${resolved ? "text-slate-500" : "text-red-700"}`}>{b.description}</div>
        )}
        <div className="text-xs text-slate-600 mt-1">
          {ROLE_LABELS[b.ownerRole]} · {b.severity}
          {b.escalationRoute && ` · ${b.escalationRoute}`}
        </div>
        {!resolved && (
          <Button
            variant="ghost"
            className="mt-2 text-xs"
            data-testid="blocker-resolve"
            onClick={() => resolveBlocker(b.id)}
            disabled={isPending}
          >
            {isPending ? "Resolving…" : "Resolve"}
          </Button>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-3" data-testid="task-blocker-panel">
      {loading ? (
        <p className="text-sm text-slate-500" data-testid="task-blocker-loading">
          Loading tasks and blockers…
        </p>
      ) : (
        <>
          {error && (
            <div
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2"
              data-testid="task-blocker-error"
            >
              {error}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <Card title={`Active tasks (${activeTasks.length})`}>
              {activeTasks.length === 0 ? (
                <p className="text-sm text-slate-500" data-testid="no-active-tasks">
                  No active tasks.
                </p>
              ) : (
                <ul className="space-y-2">{activeTasks.map((t) => renderTask(t))}</ul>
              )}
              {resolvedTasks.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                    Resolved ({resolvedTasks.length})
                  </h4>
                  <ul className="space-y-2">{resolvedTasks.map((t) => renderTask(t, true))}</ul>
                </div>
              )}
            </Card>
            <Card title={`Active blockers (${activeBlockers.length})`}>
              {activeBlockers.length === 0 ? (
                <p className="text-sm text-slate-500" data-testid="no-active-blockers">
                  No active blockers.
                </p>
              ) : (
                <ul className="space-y-2">{activeBlockers.map((b) => renderBlocker(b))}</ul>
              )}
              {resolvedBlockers.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                    Resolved ({resolvedBlockers.length})
                  </h4>
                  <ul className="space-y-2">{resolvedBlockers.map((b) => renderBlocker(b, true))}</ul>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
