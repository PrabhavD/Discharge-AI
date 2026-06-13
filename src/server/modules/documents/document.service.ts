import { ApprovalStatus, DocumentType } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { createAuditEvent } from "@/server/modules/audit/audit.service";
import {
  assertApprovalStatusTransition,
  validateDocumentApproval,
  validatePlanApproval,
} from "@/server/policy/discharge-policy";
import { generateWithProvider } from "@/server/ai/orchestrator";
import { buildAiInput } from "@/server/ai/build-ai-input";
import { loadEncounterContext } from "@/server/modules/encounters/encounter.service";
import { UserRole } from "@prisma/client";

export async function listDocuments(encounterId: string) {
  return prisma.draftDocument.findMany({
    where: { encounterId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateDocument(documentId: string, content: string, actorId: string) {
  const existing = await prisma.draftDocument.findUnique({ where: { id: documentId } });
  if (!existing) throw new Error("Document not found");

  const doc = await prisma.draftDocument.update({
    where: { id: documentId },
    data: { content, status: "DRAFT", reviewedById: actorId },
  });

  await createAuditEvent({
    actorId,
    patientId: existing.patientId,
    encounterId: existing.encounterId,
    eventType: "DOCUMENT_EDITED",
    entityType: "DraftDocument",
    entityId: documentId,
    before: { content: existing.content },
    after: { content: doc.content },
  });

  return doc;
}

export async function submitDocumentForReview(documentId: string, actorId: string) {
  const doc = await prisma.draftDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error("Document not found");
  assertApprovalStatusTransition(doc.status, "PENDING_REVIEW");

  return prisma.draftDocument.update({
    where: { id: documentId },
    data: { status: "PENDING_REVIEW", reviewedById: actorId },
  });
}

export async function approveDocument(documentId: string, approverId: string, comments?: string) {
  const validation = await validateDocumentApproval(documentId);
  if (!validation.canApprove) throw new Error(validation.errors.join("; "));

  const doc = await prisma.draftDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error("Document not found");
  if (doc.status === "DRAFT") {
    await prisma.draftDocument.update({
      where: { id: documentId },
      data: { status: "PENDING_REVIEW", reviewedById: approverId },
    });
  } else {
    assertApprovalStatusTransition(doc.status, "APPROVED");
  }

  const updated = await prisma.draftDocument.update({
    where: { id: documentId },
    data: {
      status: "APPROVED",
      approvedById: approverId,
      approvedAt: new Date(),
    },
  });

  await prisma.approval.create({
    data: {
      patientId: doc.patientId,
      encounterId: doc.encounterId,
      documentId,
      approverId,
      status: "APPROVED",
      comments,
    },
  });

  await createAuditEvent({
    actorId: approverId,
    patientId: doc.patientId,
    encounterId: doc.encounterId,
    eventType: "DOCUMENT_APPROVED",
    entityType: "DraftDocument",
    entityId: documentId,
    after: { status: "APPROVED" },
  });

  return updated;
}

export async function generateDraftDocument(
  encounterId: string,
  type: DocumentType,
  actorId: string,
  userRole: UserRole
) {
  const context = await loadEncounterContext(encounterId);
  const input = {
    ...buildAiInput(context, userRole, "DRAFT_DOCUMENT"),
    documentType: type,
  };

  const draft = await generateWithProvider((p) => p.generateDraftDocument(input, type));

  const doc = await prisma.draftDocument.create({
    data: {
      patientId: context.patientId,
      encounterId,
      type,
      title: draft.title,
      content: draft.content,
      generatedBy: "AI",
      status: "DRAFT",
    },
  });

  await createAuditEvent({
    actorId,
    patientId: context.patientId,
    encounterId,
    eventType: "AI_DRAFT_DOCUMENT_GENERATED",
    entityType: "DraftDocument",
    entityId: doc.id,
    source: "AI",
  });

  return doc;
}

export async function approveDischargePlan(
  planId: string,
  approverId: string,
  comments?: string,
  overrideReason?: string
) {
  const validation = await validatePlanApproval(planId, overrideReason);
  if (!validation.canApprove) throw new Error(validation.errors.join("; "));

  const plan = await prisma.dischargePlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");

  const updated = await prisma.dischargePlan.update({
    where: { id: planId },
    data: {
      approvalStatus: "APPROVED",
      approvedById: approverId,
      approvedAt: new Date(),
    },
  });

  await prisma.approval.create({
    data: {
      patientId: plan.patientId,
      encounterId: plan.encounterId,
      dischargePlanId: planId,
      approverId,
      status: "APPROVED",
      comments,
      overrideReason,
    },
  });

  await createAuditEvent({
    actorId: approverId,
    patientId: plan.patientId,
    encounterId: plan.encounterId,
    eventType: overrideReason ? "APPROVAL_OVERRIDE" : "PLAN_APPROVED",
    entityType: "DischargePlan",
    entityId: planId,
    after: { approvalStatus: "APPROVED" },
    metadata: { overrideReason, warnings: validation.warnings },
  });

  await createAuditEvent({
    actorId: approverId,
    patientId: plan.patientId,
    encounterId: plan.encounterId,
    eventType: "FINAL_DISCHARGE_APPROVAL",
    entityType: "DischargePlan",
    entityId: planId,
    metadata: { comments },
  });

  await prisma.metricEvent.create({
    data: {
      eventType: "discharge_plan_approved",
      encounterId: plan.encounterId,
      metadata: { planId },
    },
  });

  return updated;
}

export async function recordAiFeedback(input: {
  encounterId: string;
  planId?: string;
  userId: string;
  outputType: "DISCHARGE_PLAN" | "READINESS_SUMMARY" | "DRAFT_DOCUMENT";
  outcome: "ACCEPTED" | "EDITED" | "REJECTED";
  reason?: string;
}) {
  const encounter = await prisma.encounter.findUnique({ where: { id: input.encounterId } });
  if (!encounter) throw new Error("Encounter not found");

  return prisma.aiFeedback.create({
    data: {
      patientId: encounter.patientId,
      encounterId: input.encounterId,
      dischargePlanId: input.planId,
      userId: input.userId,
      outputType: input.outputType,
      outcome: input.outcome,
      reason: input.reason,
    },
  });
}

export async function createHazardReport(input: {
  encounterId?: string;
  patientId?: string;
  reporterId: string;
  title: string;
  description: string;
  severity: string;
}) {
  return prisma.clinicalHazardReport.create({ data: input });
}

export type { ApprovalStatus };
