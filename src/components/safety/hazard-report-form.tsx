"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui/card";

export function HazardReportForm({ encounterId }: { encounterId?: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    await fetch("/api/hazard-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encounterId,
        title,
        description,
        severity: "MEDIUM",
      }),
    });
    setSubmitted(true);
    setOpen(false);
    setTitle("");
    setDescription("");
  }

  if (submitted) {
    return (
      <p className="text-xs text-slate-500">
        Hazard report logged (concept demo). In production this would route to your clinical safety officer.
      </p>
    );
  }

  return (
    <div>
      {!open ? (
        <Button variant="ghost" className="text-xs" onClick={() => setOpen(true)}>
          Report clinical safety concern
        </Button>
      ) : (
        <Card title="Clinical hazard log (concept)">
          <input
            className="w-full border rounded p-2 text-sm mb-2"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full border rounded p-2 text-sm mb-2 min-h-[80px]"
            placeholder="Describe the concern"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={!title || !description}>Submit</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
