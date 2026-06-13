import { DischargeDomain, TaskPriority, TaskStatus, UserRole } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { createAuditEvent } from "@/server/modules/audit/audit.service";
import { recomputePlanStatus } from "@/server/modules/discharge-plan/status-recompute";

export async function listTasks(encounterId: string) {
  return prisma.dischargeTask.findMany({
    where: { encounterId },
    include: { ownerUser: { select: { id: true, name: true, role: true } } },
    orderBy: [{ status: "asc" }, { priority: "desc" }],
  });
}

export async function createTask(input: {
  encounterId: string;
  domain: DischargeDomain;
  title: string;
  description?: string;
  ownerRole: UserRole;
  ownerUserId?: string;
  priority?: TaskPriority;
  proposedByAi?: boolean;
  dischargePlanId?: string;
  actorId: string;
}) {
  const encounter = await prisma.encounter.findUnique({ where: { id: input.encounterId } });
  if (!encounter) throw new Error("Encounter not found");

  const task = await prisma.dischargeTask.create({
    data: {
      patientId: encounter.patientId,
      encounterId: input.encounterId,
      dischargePlanId: input.dischargePlanId,
      domain: input.domain,
      title: input.title,
      description: input.description,
      ownerRole: input.ownerRole,
      ownerUserId: input.ownerUserId,
      priority: input.priority ?? "MEDIUM",
      proposedByAi: input.proposedByAi ?? false,
      acceptedFromAi: input.proposedByAi ?? false,
    },
  });

  await createAuditEvent({
    actorId: input.actorId,
    patientId: encounter.patientId,
    encounterId: input.encounterId,
    eventType: "TASK_CREATED",
    entityType: "DischargeTask",
    entityId: task.id,
    after: task,
    source: input.proposedByAi ? "AI" : "HUMAN",
  });

  return task;
}

export async function updateTask(
  taskId: string,
  data: Partial<{ status: TaskStatus; title: string; description: string; ownerUserId: string; priority: TaskPriority }>,
  actorId: string
) {
  const existing = await prisma.dischargeTask.findUnique({ where: { id: taskId } });
  if (!existing) throw new Error("Task not found");

  const task = await prisma.dischargeTask.update({
    where: { id: taskId },
    data: {
      ...data,
      completedAt: data.status === "DONE" ? new Date() : existing.completedAt,
    },
  });

  await createAuditEvent({
    actorId,
    patientId: existing.patientId,
    encounterId: existing.encounterId,
    eventType: "TASK_UPDATED",
    entityType: "DischargeTask",
    entityId: task.id,
    before: existing,
    after: task,
  });

  const statusFlipped =
    data.status !== undefined && data.status !== existing.status;
  if (statusFlipped) {
    await recomputePlanStatus(existing.encounterId, actorId);
  }

  return task;
}
