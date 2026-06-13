import { AuditSource, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";

export interface AuditLogInput {
  actorId?: string | null;
  patientId?: string | null;
  encounterId?: string | null;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  source?: AuditSource;
}

export async function createAuditEvent(input: AuditLogInput) {
  return prisma.auditEvent.create({
    data: {
      actorId: input.actorId ?? null,
      patientId: input.patientId ?? null,
      encounterId: input.encounterId ?? null,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before ?? Prisma.JsonNull,
      after: input.after ?? Prisma.JsonNull,
      metadata: input.metadata ?? {},
      source: input.source ?? "HUMAN",
    },
  });
}

export async function listAuditEvents(encounterId: string, limit = 250) {
  return prisma.auditEvent.findMany({
    where: { encounterId },
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
