import { DischargeDomain, DomainStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { computeOverallStatus } from "@/server/modules/dashboard/dashboard.service";
import { createAuditEvent } from "@/server/modules/audit/audit.service";

/**
 * Recompute the discharge plan's per-domain status and overall RED/AMBER/GREEN
 * based on the live state of blockers, tasks and the original AI domain status.
 *
 * Why: AI-generated `domainStatuses` are frozen at plan generation time. Once
 * a clinician resolves blockers/completes tasks the underlying state is no
 * longer reflected in the patient header or ward dashboard. This helper
 * derives a live status by combining the AI baseline with current workflow
 * state so the UI stays in sync with reality.
 *
 * Rules per domain:
 *   - CRITICAL/HIGH active blocker          → RED
 *   - Any LOW/MEDIUM active blocker          → AMBER
 *   - Any active task (no blocker)           → AMBER (down-grade RED → AMBER)
 *   - No active blockers and no active tasks → GREEN (if AI baseline was RED/AMBER/GREY)
 *   - BLUE (N/A) is preserved
 */
export async function recomputePlanStatus(encounterId: string, actorId?: string) {
  const plan = await prisma.dischargePlan.findFirst({
    where: { encounterId },
    orderBy: { createdAt: "desc" },
    include: { domainStatuses: true },
  });
  if (!plan) return null;

  const [activeBlockers, activeTasks] = await Promise.all([
    prisma.blocker.findMany({
      where: { encounterId, status: { not: "DONE" } },
    }),
    prisma.dischargeTask.findMany({
      where: { encounterId, status: { notIn: ["DONE", "NOT_APPLICABLE"] } },
    }),
  ]);

  const blockersByDomain = new Map<DischargeDomain, typeof activeBlockers>();
  for (const b of activeBlockers) {
    if (!blockersByDomain.has(b.domain)) blockersByDomain.set(b.domain, []);
    blockersByDomain.get(b.domain)!.push(b);
  }
  const tasksByDomain = new Map<DischargeDomain, typeof activeTasks>();
  for (const t of activeTasks) {
    if (!tasksByDomain.has(t.domain)) tasksByDomain.set(t.domain, []);
    tasksByDomain.get(t.domain)!.push(t);
  }

  const previousOverall = plan.overallStatus;
  const previousDomainStatuses = plan.domainStatuses.map((d) => ({ domain: d.domain, status: d.status }));

  // Determine the new status for each existing domain row
  const updates: { id: string; previous: DomainStatus; next: DomainStatus }[] = [];

  for (const row of plan.domainStatuses) {
    if (row.status === "BLUE") continue; // N/A — never change

    const domainBlockers = blockersByDomain.get(row.domain) ?? [];
    const domainTasks = tasksByDomain.get(row.domain) ?? [];
    const hasHighBlocker = domainBlockers.some((b) => b.severity === "HIGH" || b.severity === "CRITICAL");
    const hasLowMedBlocker = domainBlockers.some((b) => b.severity === "LOW" || b.severity === "MEDIUM");

    let next: DomainStatus;
    if (hasHighBlocker) {
      next = "RED";
    } else if (hasLowMedBlocker) {
      next = "AMBER";
    } else if (domainTasks.length > 0) {
      next = "AMBER";
    } else {
      next = "GREEN";
    }

    if (next !== row.status) {
      updates.push({ id: row.id, previous: row.status, next });
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.dischargeDomainStatus.update({
          where: { id: u.id },
          data: { status: u.next },
        })
      )
    );
  }

  // Recompute overall status from the now-current domain statuses
  const refreshedStatuses = await prisma.dischargeDomainStatus.findMany({
    where: { dischargePlanId: plan.id },
  });
  const newOverall = computeOverallStatus(refreshedStatuses.map((s) => s.status));

  let updatedPlan = plan;
  if (newOverall !== previousOverall || updates.length > 0) {
    updatedPlan = await prisma.dischargePlan.update({
      where: { id: plan.id },
      data: { overallStatus: newOverall },
      include: { domainStatuses: true },
    });

    if (newOverall !== previousOverall) {
      await createAuditEvent({
        actorId: actorId ?? null,
        patientId: plan.patientId,
        encounterId,
        eventType: "PLAN_STATUS_RECOMPUTED",
        entityType: "DischargePlan",
        entityId: plan.id,
        before: { overallStatus: previousOverall, domainStatuses: previousDomainStatuses } as Prisma.InputJsonValue,
        after: {
          overallStatus: newOverall,
          domainStatuses: refreshedStatuses.map((s) => ({ domain: s.domain, status: s.status })),
        } as Prisma.InputJsonValue,
        metadata: { activeBlockerCount: activeBlockers.length, activeTaskCount: activeTasks.length },
        source: "SYSTEM",
      });
    }
  }

  return updatedPlan;
}
