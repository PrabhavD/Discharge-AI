"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui/card";
import { AiBanner } from "@/components/ui/ai-banner";
import { StatusBadge } from "@/components/ui/status-badge";

export function ApprovalPanel({
  encounterId,
  checklist,
  plan,
  documents,
  onApproved,
}: {
  encounterId: string;
  checklist: any;
  plan: any;
  documents: any[];
  onApproved: () => void;
}) {
  const [comments, setComments] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<any>(null);

  const summary = documents?.find((d) => d.type === "DISCHARGE_SUMMARY");

  async function checkValidation() {
    if (!plan?.id) return;
    const res = await fetch(`/api/discharge-plans/${plan.id}/approve`);
    const data = await res.json();
    setValidation(data);
  }

  async function approvePlan() {
    if (!plan?.id || !confirmed) {
      setError("You must confirm clinical responsibility before approving.");
      return;
    }
    setError(null);
    const res = await fetch(`/api/discharge-plans/${plan.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments, overrideReason: overrideReason || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Approval blocked");
      setValidation(data);
      return;
    }
    onApproved();
    alert("Discharge plan approved. Final human approval recorded in audit log.");
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <AiBanner />
      <Card title="Final approval checklist">
        <ul className="text-sm space-y-2 mb-4">
          <li className="flex justify-between">
            <span>Discharge plan generated</span>
            <StatusBadge status={checklist?.hasPlan ? "GREEN" : "RED"} />
          </li>
          <li className="flex justify-between">
            <span>Draft discharge summary</span>
            <StatusBadge status={checklist?.hasSummary ? "AMBER" : "RED"} />
          </li>
          <li className="flex justify-between">
            <span>Summary approved</span>
            <StatusBadge status={summary?.status === "APPROVED" ? "GREEN" : "RED"} />
          </li>
          <li className="flex justify-between">
            <span>Active blockers</span>
            <span>{checklist?.activeBlockerCount ?? 0}</span>
          </li>
          <li className="flex justify-between">
            <span>Plan approval status</span>
            <span data-testid="plan-approval-status">{checklist?.planApprovalStatus ?? "DRAFT"}</span>
          </li>
        </ul>
        <Button variant="secondary" onClick={checkValidation} data-testid="check-approval-requirements">
          Check approval requirements
        </Button>
        {validation && (
          <div className="mt-3 text-sm">
            {validation.errors?.length > 0 && (
              <ul className="text-red-700 list-disc pl-4">
                {validation.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
              </ul>
            )}
            {validation.warnings?.length > 0 && (
              <ul className="text-amber-700 list-disc pl-4 mt-2">
                {validation.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
              </ul>
            )}
            {validation.canApprove && <p className="text-emerald-700 mt-2">Ready for approval.</p>}
          </div>
        )}
      </Card>

      <Card title="Clinician confirmation">
        <p className="text-sm text-slate-700 mb-4">
          I confirm that I am an authorised clinician taking responsibility for final discharge approval.
          I have reviewed AI-generated content and confirm it reflects my clinical judgement.
        </p>
        <label className="flex items-center gap-2 text-sm mb-4">
          <input
            type="checkbox"
            data-testid="approval-confirm"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I confirm clinical responsibility for this approval
        </label>
        <textarea
          className="w-full border rounded p-2 text-sm mb-2"
          placeholder="Approval comments (optional)"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          data-testid="approval-comments"
        />
        <textarea
          className="w-full border rounded p-2 text-sm mb-4"
          placeholder="Override reason (required if RED blockers remain)"
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
          data-testid="approval-override"
        />
        {error && <p className="text-red-700 text-sm mb-2" data-testid="approval-error">{error}</p>}
        <Button
          onClick={approvePlan}
          disabled={!plan?.id || plan?.approvalStatus === "APPROVED"}
          data-testid="final-approve-plan"
        >
          Final approve discharge plan
        </Button>
      </Card>
    </div>
  );
}
