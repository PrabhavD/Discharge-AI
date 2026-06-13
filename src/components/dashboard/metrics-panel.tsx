"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

export function MetricsPanel({ wardId }: { wardId: string }) {
  const [metrics, setMetrics] = useState<{ eventType: string; count: number }[]>([]);

  useEffect(() => {
    fetch(`/api/metrics?ward=${wardId}`)
      .then((r) => r.json())
      .then((d) => setMetrics(d.summary ?? []))
      .catch(() => {});
  }, [wardId]);

  if (metrics.length === 0) return null;

  return (
    <Card title="Activity metrics (demo)">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        {metrics.map((m) => (
          <div key={m.eventType} className="rounded bg-slate-50 p-2">
            <div className="font-semibold">{m.count}</div>
            <div className="text-xs text-slate-600">{m.eventType.replace(/_/g, " ")}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
