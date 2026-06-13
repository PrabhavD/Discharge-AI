import { BlockerSeverity, DischargeDomain, TaskStatus, UserRole } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { createAuditEvent } from "@/server/modules/audit/audit.service";

export async function listBlockers(encounterId: string) {
  return prisma.blocker.findMany({
    where: { encounterId },
    include: { ownerUser: { select: { id: true, name: true, role: true } } },
    orderBy: [{ status: "asc" }, { severity: "desc" }],
  });
}

export async function createBlocker(input: {
  encounterId: string;
  domain: DischargeDomain;
  title: string;
  description?: string;
  severity?: BlockerSeverity;
  ownerRole: UserRole;
  ownerUserId?: string;
  escalationRoute?: string;
  expectedResolutionAt?: Date;
  proposedByAi?: boolean;
  dischargePlanId?: string;
  actorId: string;
}) {
  const encounter = await prisma.encounter.findUnique({ where: { id: input.encounterId } });
  if (!encounter) throw new Error("Encounter not found");

  const blocker = await prisma.blocker.create({
    data: {
      patientId: encounter.patientId,
      encounterId: input.encounterId,
      dischargePlanId: input.dischargePlanId,
      domain: input.domain,
      title: input.title,
      description: input.description,
      severity: input.severity ?? "MEDIUM",
      status: "BLOCKED",
      ownerRole: input.ownerRole,
      ownerUserId: input.ownerUserId,
      escalationRoute: input.escalationRoute,
      expectedResolutionAt: input.expectedResolutionAt,
      proposedByAi: input.proposedByAi ?? false,
      acceptedFromAi: input.proposedByAi ?? false,
    },
  });

  await createAuditEvent({
    actorId: input.actorId,
    patientId: encounter.patientId,
    encounterId: input.encounterId,
    eventType: "BLOCKER_CREATED",
    entityType: "Blocker",
    entityId: blocker.id,
    after: blocker,
    source: input.proposedByAi ? "AI" : "HUMAN",
  });

  return blocker;
}

export async function updateBlocker(
  blockerId: string,
  data: Partial<{
    status: TaskStatus;
    title: string;
    description: string;
    notes: string;
    ownerUserId: string;
    escalationRoute: string;
  }>,
  actorId: string
) {
  const existing = await prisma.blocker.findUnique({ where: { id: blockerId } });
  if (!existing) throw new Error("Blocker not found");

  const blocker = await prisma.blocker.update({
    where: { id: blockerId },
    data: {
      ...data,
      resolvedAt: data.status === "DONE" ? new Date() : existing.resolvedAt,
    },
  });

  await createAuditEvent({
    actorId,
    patientId: existing.patientId,
    encounterId: existing.encounterId,
    eventType: data.status === "DONE" ? "BLOCKER_RESOLVED" : "BLOCKER_UPDATED",
    entityType: "Blocker",
    entityId: blocker.id,
    before: existing,
    after: blocker,
  });

  return blocker;
}
