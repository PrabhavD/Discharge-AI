"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DOMAIN_LABELS, ROLE_LABELS, TASK_STATUS_LABELS } from "@/lib/constants";

export function TaskBlockerPanel({
  encounterId,
  onUpdated,
}: {
  encounterId: string;
  onUpdated: () => void;
}) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/encounters/${encounterId}/tasks`).then((r) => r.json()),
      fetch(`/api/encounters/${encounterId}/blockers`).then((r) => r.json()),
    ]).then(([t, b]) => {
      setTasks(t.tasks ?? []);
      setBlockers(b.blockers ?? []);
    });
  }, [encounterId]);

  async function completeTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
    onUpdated();
    const res = await fetch(`/api/encounters/${encounterId}/tasks`);
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }

  async function resolveBlocker(blockerId: string) {
    await fetch(`/api/blockers/${blockerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE", notes: "Resolved by clinician" }),
    });
    onUpdated();
    const res = await fetch(`/api/encounters/${encounterId}/blockers`);
    const data = await res.json();
    setBlockers(data.blockers ?? []);
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Tasks">
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks. Generate an AI plan or add manually.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="border rounded p-3 text-sm">
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
                {t.status !== "DONE" && (
                  <Button variant="ghost" className="mt-2 text-xs" onClick={() => completeTask(t.id)}>
                    Mark done
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Blockers">
        {blockers.length === 0 ? (
          <p className="text-sm text-slate-500">No active blockers.</p>
        ) : (
          <ul className="space-y-2">
            {blockers.map((b) => (
              <li key={b.id} className="border border-red-200 rounded p-3 text-sm bg-red-50">
                <div className="font-medium text-red-900">{b.title}</div>
                <div className="text-xs text-red-700 mt-1">{b.description}</div>
                <div className="text-xs text-slate-600 mt-1">
                  {ROLE_LABELS[b.ownerRole]} · {b.severity}
                  {b.escalationRoute && ` · ${b.escalationRoute}`}
                </div>
                {b.status !== "DONE" && (
                  <Button variant="ghost" className="mt-2 text-xs" onClick={() => resolveBlocker(b.id)}>
                    Resolve
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
