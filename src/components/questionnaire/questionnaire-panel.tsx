"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui/card";
import { DOMAIN_LABELS, ROLE_LABELS } from "@/lib/constants";

export function QuestionnairePanel({
  encounterId,
  onSaved,
}: {
  encounterId: string;
  onSaved: () => void;
}) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/encounters/${encounterId}/questions`)
      .then((r) => r.json())
      .then((d) => setQuestions(d.questions ?? []));
  }, [encounterId]);

  const byDomain = questions.reduce<Record<string, any[]>>((acc, q) => {
    (acc[q.domain] ??= []).push(q);
    return acc;
  }, {});

  async function saveAnswer(questionId: string, answer: string) {
    setSaving(questionId);
    await fetch(`/api/encounters/${encounterId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, value: { answer } }),
    });
    setSaving(null);
    onSaved();
    const res = await fetch(`/api/encounters/${encounterId}/questions`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
  }

  return (
    <Card title="Structured discharge questionnaire">
      <div className="space-y-6">
        {Object.entries(byDomain).map(([domain, qs]) => (
          <div key={domain}>
            <h3 className="text-sm font-semibold text-[#005eb8] mb-2">
              {DOMAIN_LABELS[domain] ?? domain}
            </h3>
            <div className="space-y-3">
              {qs.map((q: any) => (
                <div key={q.id} className="border rounded p-3 text-sm">
                  <p className="font-medium">{q.questionText}</p>
                  <p className="text-xs text-slate-500 mb-2">
                    Required: {ROLE_LABELS[q.requiredRole] ?? q.requiredRole}
                    {q.answer && ` · Last answered by ${q.answer.answeredBy?.name}`}
                  </p>
                  {q.questionType === "SELECT" ? (
                    <select
                      className="border rounded px-2 py-1"
                      value={(q.answer?.value as any)?.answer ?? ""}
                      onChange={(e) => saveAnswer(q.id, e.target.value)}
                      disabled={saving === q.id}
                    >
                      <option value="">Select…</option>
                      {(q.selectOptions as string[] | null)?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      {["yes", "no", "unknown"].map((opt) => (
                        <Button
                          key={opt}
                          variant={(q.answer?.value as any)?.answer === opt ? "primary" : "secondary"}
                          onClick={() => saveAnswer(q.id, opt)}
                          disabled={saving === q.id}
                          className="capitalize text-xs px-2 py-1"
                        >
                          {opt}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
