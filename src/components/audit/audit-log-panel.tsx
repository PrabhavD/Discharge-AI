"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { DOMAIN_LABELS } from "@/lib/constants";

const EVENT_LABELS: Record<string, string> = {
  ANSWER_UPSERTED: "Questionnaire answer",
  FREE_TEXT_NOTE_CREATED: "Clinical note added",
  WORKSPACE_VIEWED: "Workspace viewed",
  PLAN_GENERATED: "AI plan generated",
  PLAN_ACCEPTED: "AI plan accepted",
  PLAN_REJECTED: "AI plan rejected",
  PLAN_APPROVED: "Final plan approved",
  APPROVAL_OVERRIDE: "Approval with override",
  FINAL_DISCHARGE_APPROVAL: "Final discharge approved",
  DOCUMENT_GENERATED: "Document generated",
  DOCUMENT_APPROVED: "Document approved",
  DOCUMENT_REVIEWED: "Document submitted for review",
  TASK_COMPLETED: "Task completed",
  BLOCKER_RESOLVED: "Blocker resolved",
  BLOCKER_ESCALATED: "Blocker escalated",
  HAZARD_REPORTED: "Hazard reported",
};

const ANSWER_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  unknown: "Unknown",
};

function EventDetail({ event }: { event: any }) {
  const meta = event.metadata as any;
  const after = event.after as any;

  if (event.eventType === "ANSWER_UPSERTED") {
    const domain = meta?.domain ? DOMAIN_LABELS[meta.domain] ?? meta.domain : null;
    const question = meta?.questionText ?? null;
    const answer = meta?.answerValue ?? after?.value?.answer ?? null;
    const notes = after?.notes ?? null;
    return (
      <div className="text-xs text-slate-600 mt-0.5 space-y-0.5">
        {domain && <span className="inline-block bg-[#005eb8]/10 text-[#005eb8] rounded px-1.5 py-0.5 mr-1">{domain}</span>}
        {question && <span className="text-slate-700">{question}</span>}
        {answer && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-block rounded px-1.5 py-0.5 font-medium ${
              answer === "yes" ? "bg-green-100 text-green-800" :
              answer === "no" ? "bg-red-100 text-red-800" :
              "bg-slate-100 text-slate-700"
            }`}>
              {ANSWER_LABELS[answer] ?? answer}
            </span>
            {event.before?.value?.answer && event.before.value.answer !== answer && (
              <span className="text-slate-400">
                (was: {ANSWER_LABELS[event.before.value.answer] ?? event.before.value.answer})
              </span>
            )}
          </div>
        )}
        {notes && <p className="text-slate-500 italic mt-0.5">Note: {notes}</p>}
      </div>
    );
  }

  if (event.eventType === "FREE_TEXT_NOTE_CREATED") {
    const text = after?.text as string | undefined;
    return text ? (
      <p className="text-xs text-slate-600 mt-0.5 italic line-clamp-2">{text}</p>
    ) : null;
  }

  if (event.eventType === "FINAL_DISCHARGE_APPROVAL" || event.eventType === "PLAN_APPROVED") {
    const overrideReason = meta?.overrideReason as string | undefined;
    return overrideReason ? (
      <p className="text-xs text-amber-700 mt-0.5">Override reason: {overrideReason}</p>
    ) : null;
  }

  return null;
}

export function AuditLogPanel({ encounterId }: { encounterId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "answers" | "approvals">("all");

  useEffect(() => {
    fetch(`/api/encounters/${encounterId}/audit`)
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []));
  }, [encounterId]);

  const filtered = events.filter((ev) => {
    if (filter === "answers") return ["ANSWER_UPSERTED", "FREE_TEXT_NOTE_CREATED"].includes(ev.eventType);
    if (filter === "approvals") return ["PLAN_APPROVED", "APPROVAL_OVERRIDE", "FINAL_DISCHARGE_APPROVAL", "DOCUMENT_APPROVED", "DOCUMENT_REVIEWED"].includes(ev.eventType);
    return ev.eventType !== "WORKSPACE_VIEWED";
  });

  return (
    <Card title="Audit log">
      {/* Filter pills */}
      <div className="flex gap-2 mb-3">
        {(["all", "answers", "approvals"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`text-xs rounded-full px-3 py-1 transition-colors ${
              filter === f ? "bg-[#005eb8] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f === "all" ? "All events" : f === "answers" ? "Questionnaire" : "Approvals"}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">{filtered.length} events</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-2 pr-3 font-medium">Time</th>
              <th className="pb-2 pr-3 font-medium">Event</th>
              <th className="pb-2 pr-3 font-medium">Actor</th>
              <th className="pb-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev) => (
              <tr key={ev.id} className="border-b align-top">
                <td className="py-2 pr-3 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(ev.createdAt)}</td>
                <td className="py-2 pr-3">
                  <span className="font-medium text-slate-800">
                    {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                  </span>
                  <span className="block text-xs text-slate-400 font-mono">{ev.eventType}</span>
                </td>
                <td className="py-2 pr-3 text-sm">
                  {ev.actor?.name ?? <span className="text-slate-400">System</span>}
                  {ev.actor?.role && (
                    <span className="block text-xs text-slate-400">{ev.source}</span>
                  )}
                </td>
                <td className="py-2">
                  <EventDetail event={ev} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-slate-500 py-4 text-sm">No audit events{filter !== "all" ? " for this filter" : ""}.</p>
        )}
      </div>
    </Card>
  );
}
