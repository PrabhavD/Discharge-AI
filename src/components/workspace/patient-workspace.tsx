"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { AiBanner } from "@/components/ui/ai-banner";
import { Card, Button } from "@/components/ui/card";
import { DOMAIN_LABELS, ROLE_LABELS, DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import { QuestionnairePanel } from "@/components/questionnaire/questionnaire-panel";
import { FreeTextPanel } from "@/components/workspace/free-text-panel";
import { TaskBlockerPanel } from "@/components/workspace/task-blocker-panel";
import { ApprovalPanel } from "@/components/approval/approval-panel";
import { AuditLogPanel } from "@/components/audit/audit-log-panel";
import { HazardReportForm } from "@/components/safety/hazard-report-form";

type Tab = "summary" | "questionnaire" | "plan" | "tasks" | "documents" | "approval" | "audit";

export function PatientWorkspace({ encounterId }: { encounterId: string }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [data, setData] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadWorkspace(silent = false) {
    if (!silent) setLoading(true);
    const res = await fetch(`/api/encounters/${encounterId}/discharge-workspace`);
    if (res.status === 401) {
      setError("Select a demo user from the header.");
      setLoading(false);
      return;
    }
    const ws = await res.json();
    setData(ws);

    const planRes = await fetch(`/api/encounters/${encounterId}/ai/discharge-plan`);
    const planData = await planRes.json();
    setPlan(planData.plan);

    const docRes = await fetch(`/api/encounters/${encounterId}/documents`);
    const docData = await docRes.json();
    setDocuments(docData.documents ?? []);

    setLoading(false);
  }

  useEffect(() => {
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  async function generatePlan() {
    setGenerating(true);
    const res = await fetch(`/api/encounters/${encounterId}/ai/discharge-plan`, { method: "POST" });
    const result = await res.json();
    if (!res.ok) alert(result.error ?? "Generation failed");
    else {
      setPlan(result.plan);
      await loadWorkspace(true);
    }
    setGenerating(false);
  }

  async function generateReadiness() {
    const res = await fetch(`/api/encounters/${encounterId}/ai/readiness-summary`, { method: "POST" });
    const result = await res.json();
    if (!res.ok) alert(result.error ?? "Generation failed");
    else setReadiness(result.summary);
  }

  if (loading) return <p className="text-slate-500">Loading patient workspace…</p>;
  if (error) return <Card title="Access"><p>{error}</p></Card>;
  if (!data?.workspace) return <p>Encounter not found</p>;

  const { workspace, checklist, staleBlockers } = data;
  const patient = workspace.patient;
  const snapshot = workspace.clinicalSnapshots?.[0];

  const tabs: { id: Tab; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "questionnaire", label: "Questionnaire" },
    { id: "plan", label: "AI plan" },
    { id: "tasks", label: "Tasks & blockers" },
    { id: "documents", label: "Documents" },
    { id: "approval", label: "Approval" },
    { id: "audit", label: "Audit log" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/wards/4A" className="text-sm text-[#005eb8] hover:underline">
            ← Back to ward
          </Link>
          <h1 className="text-2xl font-bold mt-1">
            {patient.lastName}, {patient.firstName}
          </h1>
          <p className="text-slate-600 text-sm">
            NHS {patient.nhsNumber} · Bed {workspace.bed} · {workspace.consultantName} · Admitted{" "}
            {formatDate(workspace.admissionDate)}
          </p>
        </div>
        {plan && (
          <div data-testid="patient-overall-status">
            <StatusBadge status={plan.overallStatus} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === t.id ? "bg-[#005eb8] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Clinical snapshot (EPR)" className="md:col-span-2">
            {snapshot ? (
              <div className="space-y-4 text-sm">
                <dl className="grid sm:grid-cols-2 gap-3">
                  <div><dt className="text-slate-500">Diagnoses</dt><dd>{(snapshot.diagnoses as string[]).join(", ")}</dd></div>
                  <div><dt className="text-slate-500">NEWS2</dt><dd>{snapshot.news2Score ?? "—"}</dd></div>
                  <div><dt className="text-slate-500">Frailty</dt><dd>{snapshot.frailtyScore ?? "—"}</dd></div>
                  <div><dt className="text-slate-500">Allergies</dt><dd>{(snapshot.allergies as string[]).join(", ") || "None recorded"}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-slate-500">Problem list</dt><dd>{((snapshot.problemList as string[]) ?? []).join(", ") || "—"}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-slate-500">Medications</dt><dd>{((snapshot.currentMedications as Array<{ name: string; dose?: string }>) ?? []).map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}`).join(", ") || "—"}</dd></div>
                  <div><dt className="text-slate-500">Captured</dt><dd>{formatDateTime(snapshot.capturedAt)}</dd></div>
                </dl>

                {((snapshot.bloodResults as Array<{ test: string; value: string; unit?: string; date?: string; note?: string }>) ?? []).length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">Blood results</h4>
                    <ul className="space-y-1">
                      {(snapshot.bloodResults as Array<{ test: string; value: string; unit?: string; note?: string }>).map((r, i) => (
                        <li key={i} className="text-slate-700">
                          <span className="font-medium">{r.test}</span> {r.value}{r.unit ? ` ${r.unit}` : ""}
                          {r.note ? <span className="text-slate-500"> — {r.note}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {((snapshot.imagingReports as Array<{ modality?: string; date?: string; author?: string; conclusion?: string }>) ?? []).length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">Imaging reports</h4>
                    <ul className="space-y-3">
                      {(snapshot.imagingReports as Array<{ modality?: string; date?: string; author?: string; conclusion?: string }>).map((r, i) => (
                        <li key={i} className="border-l-2 border-slate-200 pl-3">
                          <div className="font-medium">{r.modality ?? "Imaging"}</div>
                          {r.date && <div className="text-xs text-slate-400">{formatDateTime(r.date)} · {r.author ?? "Radiology"}</div>}
                          <p className="text-slate-600 mt-1">{r.conclusion}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {((snapshot.rawPayload as { notes?: Array<{ timestamp: string; author: string; role: string; text: string }> })?.notes ?? []).length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer font-medium text-slate-700 list-none flex items-center gap-2">
                      <span className="group-open:rotate-90 transition-transform">▸</span>
                      Clinical notes timeline ({((snapshot.rawPayload as { notes?: unknown[] }).notes ?? []).length} entries)
                    </summary>
                    <ul className="mt-2 space-y-2 max-h-80 overflow-y-auto border rounded-md p-3 bg-slate-50">
                      {((snapshot.rawPayload as { notes: Array<{ timestamp: string; author: string; role: string; text: string }> }).notes).map((n, i) => (
                        <li key={i} className="border-l-2 border-[#005eb8] pl-3">
                          <div className="text-xs text-slate-500">{formatDateTime(n.timestamp)} · {n.author} ({n.role})</div>
                          <p className="text-slate-700">{n.text}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-amber-700 text-sm">No clinical snapshot — EPR integration unavailable.</p>
            )}
          </Card>
          <Card title="Discharge readiness">
            <AiBanner className="mb-3" />
            {readiness ? (
              <div className="text-sm space-y-2">
                <StatusBadge status={readiness.overallStatus} />
                <p>{readiness.summary}</p>
                {readiness.uncertainty?.length > 0 && (
                  <ul className="list-disc pl-4 text-amber-800">
                    {readiness.uncertainty.map((u: string, i: number) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-600 mb-3">No readiness summary generated yet.</p>
            )}
            <div className="flex gap-2 mt-3">
              <Button variant="secondary" onClick={generateReadiness}>Generate readiness summary</Button>
              <Button onClick={generatePlan} disabled={generating} data-testid="generate-ai-plan">
                {generating ? "Generating…" : "Generate AI discharge plan"}
              </Button>
            </div>
          </Card>
          <Card title="Source evidence" className="md:col-span-2">
            <ul className="text-sm space-y-2">
              {(workspace.sourceEvidence ?? []).map((ev: any) => (
                <li key={ev.id} className="border-l-2 border-[#005eb8] pl-3">
                  <div className="font-medium">{ev.label}</div>
                  <div className="text-slate-600">{ev.excerpt}</div>
                  <div className="text-xs text-slate-400">{ev.sourceSystem} · {formatDateTime(ev.capturedAt)}</div>
                </li>
              ))}
              {(!workspace.sourceEvidence || workspace.sourceEvidence.length === 0) && (
                <li className="text-slate-500">Generate an AI plan to populate source evidence links.</li>
              )}
            </ul>
          </Card>
          {staleBlockers?.length > 0 && (
            <Card title="Escalation alerts" className="md:col-span-2 border-red-200">
              <ul className="text-sm text-red-800 space-y-1">
                {staleBlockers.map((b: any, i: number) => (
                  <li key={i}>{b.escalationMessage}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === "questionnaire" && (
        <div className="grid md:grid-cols-2 gap-4">
          <QuestionnairePanel encounterId={encounterId} onSaved={() => loadWorkspace(true)} />
          <FreeTextPanel encounterId={encounterId} onSaved={() => loadWorkspace(true)} />
        </div>
      )}

      {tab === "plan" && (
        <div className="space-y-4">
          <AiBanner />
          {!plan ? (
            <Card>
              <p className="text-sm text-slate-600 mb-3">No discharge plan yet.</p>
              <Button onClick={generatePlan} disabled={generating}>
                {generating ? "Generating…" : "Generate AI discharge plan"}
              </Button>
            </Card>
          ) : (
            <>
              <Card title="Overall assessment">
                <div className="flex items-center gap-3 mb-2">
                  <StatusBadge status={plan.overallStatus} />
                  <span className="text-xs text-slate-500">Confidence: {(plan.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="text-sm">{plan.summary}</p>
                {plan.uncertainty?.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-amber-800 uppercase">Uncertainty</h4>
                    <ul className="list-disc pl-4 text-sm text-amber-900">
                      {(plan.uncertainty as string[]).map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" onClick={async () => {
                    await fetch(`/api/encounters/${encounterId}/ai/discharge-plan`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "accept", planId: plan.id }),
                    });
                    loadWorkspace(true);
                  }}>Accept suggestions</Button>
                  <Button variant="ghost" onClick={async () => {
                    await fetch(`/api/encounters/${encounterId}/ai/discharge-plan`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "reject", planId: plan.id, reason: "Clinician rejected" }),
                    });
                    loadWorkspace(true);
                  }}>Reject</Button>
                </div>
              </Card>
              <Card title="Domain status">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="pb-2">Domain</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Owner</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.domainStatuses?.map((d: any) => (
                      <tr key={d.id} className="border-b">
                        <td className="py-2">{DOMAIN_LABELS[d.domain] ?? d.domain}</td>
                        <td className="py-2"><StatusBadge status={d.status} /></td>
                        <td className="py-2">{ROLE_LABELS[d.ownerRole] ?? d.ownerRole}</td>
                        <td className="py-2">{d.actionRequired ?? d.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              {(plan.missingInformation as any[])?.length > 0 && (
                <Card title="Missing information">
                  <ul className="text-sm space-y-1">
                    {(plan.missingInformation as any[]).map((m, i) => (
                      <li key={i}>{m.question} — {ROLE_LABELS[m.requiredRole]}</li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {tab === "tasks" && (
        <TaskBlockerPanel encounterId={encounterId} onUpdated={() => loadWorkspace(true)} />
      )}

      {tab === "documents" && (
        <DocumentPanel
          encounterId={encounterId}
          documents={documents}
          onUpdated={() => loadWorkspace(true)}
        />
      )}

      {tab === "approval" && (
        <ApprovalPanel
          encounterId={encounterId}
          checklist={checklist}
          plan={plan}
          documents={documents}
          onApproved={() => loadWorkspace(true)}
        />
      )}

      {tab === "audit" && (
        <div className="space-y-4">
          <AuditLogPanel encounterId={encounterId} />
          <HazardReportForm encounterId={encounterId} />
        </div>
      )}
    </div>
  );
}

function DocumentPanel({
  encounterId,
  documents,
  onUpdated,
}: {
  encounterId: string;
  documents: any[];
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState<any>(null);
  const [content, setContent] = useState("");

  async function generateDoc() {
    await fetch(`/api/encounters/${encounterId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DISCHARGE_SUMMARY" }),
    });
    onUpdated();
  }

  return (
    <div className="space-y-4">
      <AiBanner />
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Draft documents</h2>
        <Button variant="secondary" onClick={generateDoc} data-testid="generate-discharge-summary">
          Generate discharge summary
        </Button>
      </div>
      {documents.map((doc) => (
        <Card key={doc.id} title={`${DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} — ${doc.status}`}>
          {editing?.id === doc.id ? (
            <div className="space-y-2">
              <textarea
                className="w-full min-h-[200px] border rounded p-2 text-sm font-mono"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={async () => {
                  await fetch(`/api/documents/${doc.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content }),
                  });
                  setEditing(null);
                  onUpdated();
                }}>Save edits</Button>
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <pre className="text-xs whitespace-pre-wrap bg-slate-50 p-3 rounded max-h-64 overflow-auto">{doc.content}</pre>
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" onClick={() => { setEditing(doc); setContent(doc.content); }}>Edit</Button>
                <Button variant="secondary" onClick={async () => {
                  await fetch(`/api/documents/${doc.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "submit_review" }),
                  });
                  onUpdated();
                }}>Submit for review</Button>
                <Button
                  data-testid="approve-document"
                  onClick={async () => {
                  const res = await fetch(`/api/documents/${doc.id}`, { method: "POST" });
                  const data = await res.json();
                  if (!res.ok) alert(data.error);
                  else onUpdated();
                }}>Approve document</Button>
              </div>
            </>
          )}
        </Card>
      ))}
      {documents.length === 0 && <p className="text-slate-500 text-sm">No documents yet. Generate a discharge summary or AI plan.</p>}
    </div>
  );
}
