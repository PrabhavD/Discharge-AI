"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export function FreeTextPanel({
  encounterId,
  onSaved,
}: {
  encounterId: string;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/encounters/${encounterId}/free-text-notes`)
      .then((r) => r.json())
      .then((d) => setNotes(d.notes ?? []));
  }, [encounterId]);

  async function submit() {
    if (!text.trim()) return;
    setSaving(true);
    await fetch(`/api/encounters/${encounterId}/free-text-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setText("");
    setSaving(false);
    onSaved();
    const res = await fetch(`/api/encounters/${encounterId}/free-text-notes`);
    const data = await res.json();
    setNotes(data.notes ?? []);
  }

  return (
    <Card title="Free-text clinical context">
      <textarea
        className="w-full border rounded p-2 text-sm min-h-[100px]"
        placeholder="e.g. Patient lives alone. Daughter can collect after 5pm. Awaiting OT stair assessment."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button className="mt-2" onClick={submit} disabled={saving || !text.trim()}>
        Add note
      </Button>
      <ul className="mt-4 space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="text-sm border-l-2 border-slate-300 pl-3">
            <p>{n.text}</p>
            <p className="text-xs text-slate-500">
              {n.author?.name} · {formatDateTime(n.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
