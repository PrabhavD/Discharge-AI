import { DomainStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { DEFAULT_WARD_ID } from "@/lib/constants";

export interface DashboardFilters {
  status?: string;
  blocker?: string;
  owner?: string;
}

export async function getWardDashboard(wardId: string, filters: DashboardFilters = {}) {
  const ward = wardId === DEFAULT_WARD_ID ? "4A" : wardId;

  const encounters = await prisma.encounter.findMany({
    where: { ward, status: "ACTIVE" },
    include: {
      patient: true,
      blockers: { where: { status: { not: "DONE" } }, orderBy: { severity: "desc" } },
      tasks: { where: { status: { notIn: ["DONE", "NOT_APPLICABLE"] } } },
      dischargePlans: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { expectedDischargeDate: "asc" },
  });

  const rows = encounters.map((enc) => {
    const plan = enc.dischargePlans[0];
    const mainBlocker = enc.blockers[0];
    const nextTask = enc.tasks.find((t) => t.status !== "DONE");
    const readinessStatus = plan?.overallStatus ?? "GREY";

    return {
      encounterId: enc.id,
      patientId: enc.patientId,
      patientName: `${enc.patient.lastName}, ${enc.patient.firstName}`,
      nhsNumber: enc.patient.nhsNumber,
      ward: enc.ward,
      bed: enc.bed,
      consultant: enc.consultantName,
      expectedDischargeDate: enc.expectedDischargeDate,
      readinessStatus,
      approvalStatus: plan?.approvalStatus ?? "DRAFT",
      mainBlocker: mainBlocker?.title ?? null,
      mainBlockerSeverity: mainBlocker?.severity ?? null,
      nextAction: nextTask?.title ?? mainBlocker?.title ?? "Complete discharge assessment",
      ownerRole: nextTask?.ownerRole ?? mainBlocker?.ownerRole ?? null,
      blockerCount: enc.blockers.length,
      lastUpdate: plan?.updatedAt ?? enc.updatedAt,
      likelyToday:
        enc.expectedDischargeDate &&
        new Date(enc.expectedDischargeDate).toDateString() === new Date().toDateString(),
    };
  });

  let filtered = rows;
  if (filters.status) {
    filtered = filtered.filter((r) => r.readinessStatus === filters.status);
  }
  if (filters.blocker === "blocked") {
    filtered = filtered.filter((r) => r.blockerCount > 0);
  }
  if (filters.owner) {
    filtered = filtered.filter((r) => r.ownerRole === filters.owner);
  }

  const summary = {
    total: rows.length,
    likelyToday: rows.filter((r) => r.likelyToday).length,
    blocked: rows.filter((r) => r.blockerCount > 0).length,
    awaitingDoctor: rows.filter((r) => r.ownerRole === "DOCTOR" || r.ownerRole === "CONSULTANT").length,
    awaitingNurse: rows.filter((r) => r.ownerRole === "NURSE").length,
    awaitingPharmacy: rows.filter((r) => r.ownerRole === "PHARMACIST").length,
    awaitingTherapy: rows.filter(
      (r) => r.ownerRole === "PHYSIOTHERAPIST" || r.ownerRole === "OCCUPATIONAL_THERAPIST"
    ).length,
    awaitingTransport: rows.filter((r) => r.mainBlocker?.toLowerCase().includes("transport")).length,
    awaitingCare: rows.filter((r) => r.ownerRole === "DISCHARGE_COORDINATOR").length,
  };

  return { ward, rows: filtered, summary, allRows: rows };
}

export function computeOverallStatus(domainStatuses: DomainStatus[]): DomainStatus {
  if (domainStatuses.includes("RED")) return "RED";
  if (domainStatuses.includes("AMBER")) return "AMBER";
  if (domainStatuses.every((s) => s === "GREEN" || s === "BLUE")) return "GREEN";
  return "GREY";
}

export function isStaleBlocker(updatedAt: Date, hours = 3): boolean {
  return Date.now() - updatedAt.getTime() > hours * 60 * 60 * 1000;
}

export function getStaleBlockers<T extends { updatedAt: Date; title: string; ownerRole: string }>(
  blockers: T[]
) {
  return blockers.filter((b) => isStaleBlocker(b.updatedAt)).map((b) => ({
    ...b,
    escalationMessage: `${b.title} unresolved for 3+ hours. Notify ${b.ownerRole.toLowerCase().replace("_", " ")} and discharge coordinator.`,
  }));
}
