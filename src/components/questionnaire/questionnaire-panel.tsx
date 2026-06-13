"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button } from "@/components/ui/card";
import { DOMAIN_LABELS, ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

interface ServerAnswer {
  id: string;
  value: { answer: string };
  notes: string | null;
  updatedAt: string;
  answeredBy: { id: string; name: string; role: string };
}

interface Question {
  id: string;
  domain: string;
  questionText: string;
  questionType: "YES_NO" | "YES_NO_UNKNOWN" | "SELECT" | "TEXT";
  requiredRole: string;
  isRequired: boolean;
  selectOptions: string[] | null;
  answer: ServerAnswer | null;
}

interface LocalAnswer {
  answer: string;
  notes: string;
}

export function QuestionnairePanel({
  encounterId,
  onSaved,
}: {
  encounterId: string;
  onSaved: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  // Optimistic local state — drives UI immediately without waiting for server
  const [localAnswers, setLocalAnswers] = useState<Record<string, LocalAnswer>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const loadQuestions = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/questions`);
    const data = await res.json();
    const qs: Question[] = data.questions ?? [];
    setQuestions(qs);
    // Seed local state from server, but never overwrite in-flight edits
    setLocalAnswers((prev) => {
      const next = { ...prev };
      for (const q of qs) {
        if (!(q.id in next) && q.answer) {
          next[q.id] = {
            answer: (q.answer.value as any)?.answer ?? "",
            notes: q.answer.notes ?? "",
          };
        }
      }
      return next;
    });
    setLoaded(true);
  }, [encounterId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  async function saveAnswer(questionId: string, answer: string) {
    setError(null);
    // Optimistic update so the UI responds instantly
    setLocalAnswers((prev) => ({
      ...prev,
      [questionId]: { answer, notes: prev[questionId]?.notes ?? "" },
    }));
    setSaving((prev) => new Set(prev).add(questionId));

    const res = await fetch(`/api/encounters/${encounterId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId,
        value: { answer },
        notes: localAnswers[questionId]?.notes || undefined,
      }),
    });

    setSaving((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Failed to save answer. You may not have permission for this question.");
      // Roll back by reloading from server
      await loadQuestions();
    } else {
      const data = await res.json();
      // Confirm local state from server response
      const saved = data.answer;
      if (saved) {
        setLocalAnswers((prev) => ({
          ...prev,
          [questionId]: {
            answer: (saved.value as any)?.answer ?? answer,
            notes: saved.notes ?? prev[questionId]?.notes ?? "",
          },
        }));
        // Refresh questions in background to update answeredBy metadata
        loadQuestions();
      }
      onSaved();
    }
  }

  async function saveNotes(questionId: string, notes: string) {
    const current = localAnswers[questionId];
    if (!current?.answer) return; // can only save notes alongside an answer
    setError(null);
    const noteKey = `${questionId}-notes`;
    setSaving((prev) => new Set(prev).add(noteKey));

    const res = await fetch(`/api/encounters/${encounterId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, value: { answer: current.answer }, notes }),
    });

    setSaving((prev) => {
      const next = new Set(prev);
      next.delete(noteKey);
      return next;
    });

    if (res.ok) {
      onSaved();
      loadQuestions();
    }
  }

  function toggleNotes(questionId: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  }

  const byDomain = questions.reduce<Record<string, Question[]>>((acc, q) => {
    (acc[q.domain] ??= []).push(q);
    return acc;
  }, {});

  const requiredQuestions = questions.filter((q) => q.isRequired);
  const answeredCount = requiredQuestions.filter((q) => localAnswers[q.id]?.answer).length;
  const totalCount = requiredQuestions.length;
  const progressPct = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

  if (!loaded) {
    return (
      <Card title="Structured discharge questionnaire">
        <p className="text-slate-500 text-sm">Loading questionnaire…</p>
      </Card>
    );
  }

  return (
    <Card title="Structured discharge questionnaire">
      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Required questions answered</span>
          <span className="font-medium">{answeredCount} / {totalCount}</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              backgroundColor: progressPct === 100 ? "#16a34a" : "#005eb8",
            }}
          />
        </div>
        {progressPct === 100 && (
          <p className="text-xs text-green-700 mt-1 font-medium">All required questions answered ✓</p>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(byDomain).map(([domain, qs]) => {
          const domainRequired = qs.filter((q) => q.isRequired);
          const domainAnswered = domainRequired.filter((q) => localAnswers[q.id]?.answer).length;
          return (
            <div key={domain}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#005eb8]">
                  {DOMAIN_LABELS[domain] ?? domain}
                </h3>
                {domainRequired.length > 0 && (
                  <span className={`text-xs ${domainAnswered === domainRequired.length ? "text-green-700 font-medium" : "text-slate-400"}`}>
                    {domainAnswered}/{domainRequired.length}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {qs.map((q) => {
                  const local = localAnswers[q.id];
                  const isSaving = saving.has(q.id);
                  const notesSaving = saving.has(`${q.id}-notes`);
                  const notesOpen = expandedNotes.has(q.id);
                  const hasAnswer = !!local?.answer;

                  return (
                    <div
                      key={q.id}
                      data-testid="question-item"
                      className={`border rounded-lg p-3 text-sm transition-colors duration-200 ${
                        hasAnswer
                          ? "border-green-200 bg-green-50/40"
                          : q.isRequired
                          ? "border-amber-200 bg-amber-50/20"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium leading-snug">{q.questionText}</p>
                        {!q.isRequired && (
                          <span className="text-xs text-slate-400 shrink-0 pt-0.5">Optional</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mb-2">
                        <span className="font-medium">{ROLE_LABELS[q.requiredRole] ?? q.requiredRole}</span>
                        {q.answer ? (
                          <>
                            {" · "}Last answered by{" "}
                            <span className="font-medium">{q.answer.answeredBy.name}</span>
                            {" "}({ROLE_LABELS[q.answer.answeredBy.role] ?? q.answer.answeredBy.role}){" "}
                            · {formatDateTime(q.answer.updatedAt)}
                          </>
                        ) : (
                          " · Not yet answered"
                        )}
                      </p>

                      {/* Answer controls */}
                      {q.questionType === "SELECT" ? (
                        <select
                          className="border rounded px-2 py-1 text-sm bg-white disabled:opacity-60"
                          value={local?.answer ?? ""}
                          onChange={(e) => saveAnswer(q.id, e.target.value)}
                          disabled={isSaving}
                        >
                          <option value="">Select…</option>
                          {q.selectOptions?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : q.questionType === "TEXT" ? (
                        <textarea
                          className="border rounded px-2 py-1 text-sm w-full disabled:opacity-60"
                          rows={2}
                          defaultValue={local?.answer ?? ""}
                          placeholder="Enter response…"
                          onBlur={(e) => {
                            if (e.target.value !== (local?.answer ?? "")) {
                              saveAnswer(q.id, e.target.value);
                            }
                          }}
                          disabled={isSaving}
                        />
                      ) : (
                        <div className="flex gap-2">
                          {(q.questionType === "YES_NO" ? ["yes", "no"] : ["yes", "no", "unknown"]).map(
                            (opt) => (
                              <Button
                                key={opt}
                                variant={local?.answer === opt ? "primary" : "secondary"}
                                onClick={() => saveAnswer(q.id, opt)}
                                disabled={isSaving}
                                className="capitalize text-xs px-3 py-1"
                              >
                                {opt}
                              </Button>
                            )
                          )}
                          {isSaving && (
                            <span className="text-xs text-slate-400 self-center">Saving…</span>
                          )}
                        </div>
                      )}

                      {/* Inline notes */}
                      <div className="mt-2">
                        <button
                          type="button"
                          className="text-xs text-[#005eb8] hover:underline"
                          onClick={() => toggleNotes(q.id)}
                        >
                          {notesOpen
                            ? "Hide note"
                            : local?.notes
                            ? "Edit note"
                            : "Add note"}
                          {!notesOpen && local?.notes && (
                            <span className="ml-1 text-slate-500 font-normal">
                              · {local.notes.length > 50 ? local.notes.slice(0, 50) + "…" : local.notes}
                            </span>
                          )}
                        </button>

                        {notesOpen && (
                          <div className="mt-1.5 space-y-1">
                            <textarea
                              className="border rounded px-2 py-1 text-sm w-full text-slate-700 disabled:opacity-60"
                              rows={2}
                              placeholder="Optional clinical notes for this answer…"
                              value={local?.notes ?? ""}
                              onChange={(e) =>
                                setLocalAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: {
                                    answer: prev[q.id]?.answer ?? "",
                                    notes: e.target.value,
                                  },
                                }))
                              }
                              onBlur={(e) => saveNotes(q.id, e.target.value)}
                              disabled={notesSaving}
                            />
                            {notesSaving && (
                              <p className="text-xs text-slate-400">Saving note…</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
