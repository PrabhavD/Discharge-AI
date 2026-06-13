"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_WARD_NAME } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, Button } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";

interface DashboardRow {
  encounterId: string;
  patientName: string;
  nhsNumber: string;
  bed: string;
  consultant: string;
  expectedDischargeDate: string | null;
  readinessStatus: string;
  mainBlocker: string | null;
  nextAction: string;
  ownerRole: string | null;
  blockerCount: number;
  lastUpdate: string;
  likelyToday: boolean;
}

interface DashboardData {
  summary: Record<string, number>;
  rows: DashboardRow[];
}

export function WardDashboard({ wardId }: { wardId: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter === "blocked") params.set("blocker", "blocked");
    if (filter.startsWith("status:")) params.set("status", filter.replace("status:", ""));

    fetch(`/api/wards/${wardId}/discharge-dashboard?${params}`)
      .then(async (r) => {
        if (r.status === 401) {
          setError("Select a demo user from the header to continue.");
          return null;
        }
        return r.json();
      })
      .then((d) => d && setData(d))
      .catch(() => setError("Failed to load dashboard"));
  }, [wardId, filter]);

  if (error) {
    return (
      <Card title="Sign in required">
        <p className="text-slate-600">{error}</p>
      </Card>
    );
  }

  if (!data) return <p className="text-slate-500">Loading ward dashboard…</p>;

  const { summary, rows } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ward discharge dashboard</h1>
        <p className="text-slate-600">{DEFAULT_WARD_NAME}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: "Inpatients", value: summary.total, filter: "" },
          { label: "Likely today", value: summary.likelyToday, filter: "" },
          { label: "Blocked", value: summary.blocked, filter: "blocked" },
          { label: "Awaiting doctor", value: summary.awaitingDoctor, filter: "" },
          { label: "Awaiting pharmacy", value: summary.awaitingPharmacy, filter: "" },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setFilter(s.filter)}
            className="rounded-lg border bg-white p-3 text-left hover:border-[#005eb8]"
          >
            <div className="text-2xl font-bold text-[#005eb8]">{s.value}</div>
            <div className="text-xs text-slate-600">{s.label}</div>
          </button>
        ))}
      </div>

      <Card title="Patients">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 pr-3">Patient</th>
                <th className="pb-2 pr-3">Bed</th>
                <th className="pb-2 pr-3">Consultant</th>
                <th className="pb-2 pr-3">Expected DC</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Main blocker</th>
                <th className="pb-2 pr-3">Next action</th>
                <th className="pb-2 pr-3">Owner</th>
                <th className="pb-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.encounterId} className="border-b hover:bg-slate-50">
                  <td className="py-2 pr-3">
                    <Link
                      href={`/encounters/${row.encounterId}`}
                      className="font-medium text-[#005eb8] hover:underline"
                    >
                      {row.patientName}
                    </Link>
                    <div className="text-xs text-slate-500">{row.nhsNumber}</div>
                  </td>
                  <td className="py-2 pr-3">{row.bed}</td>
                  <td className="py-2 pr-3">{row.consultant}</td>
                  <td className="py-2 pr-3">{formatDate(row.expectedDischargeDate)}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={row.readinessStatus} />
                  </td>
                  <td className="py-2 pr-3 text-red-700">{row.mainBlocker ?? "—"}</td>
                  <td className="py-2 pr-3">{row.nextAction}</td>
                  <td className="py-2 pr-3">
                    {row.ownerRole ? ROLE_LABELS[row.ownerRole] ?? row.ownerRole : "—"}
                  </td>
                  <td className="py-2 text-xs text-slate-500">{formatDateTime(row.lastUpdate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filter && (
          <div className="mt-3">
            <Button variant="ghost" onClick={() => setFilter("")}>
              Clear filter
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
