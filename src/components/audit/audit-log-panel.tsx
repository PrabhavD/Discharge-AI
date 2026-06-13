"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export function AuditLogPanel({ encounterId }: { encounterId: string }) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/encounters/${encounterId}/audit`)
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []));
  }, [encounterId]);

  return (
    <Card title="Audit log">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-2 pr-3">Time</th>
              <th className="pb-2 pr-3">Event</th>
              <th className="pb-2 pr-3">Actor</th>
              <th className="pb-2 pr-3">Source</th>
              <th className="pb-2">Entity</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-b">
                <td className="py-2 pr-3 text-xs">{formatDateTime(ev.createdAt)}</td>
                <td className="py-2 pr-3 font-mono text-xs">{ev.eventType}</td>
                <td className="py-2 pr-3">{ev.actor?.name ?? "System"}</td>
                <td className="py-2 pr-3">{ev.source}</td>
                <td className="py-2 text-xs">{ev.entityType}{ev.entityId ? ` · ${ev.entityId.slice(0, 8)}…` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <p className="text-slate-500 py-4">No audit events yet.</p>}
      </div>
    </Card>
  );
}
