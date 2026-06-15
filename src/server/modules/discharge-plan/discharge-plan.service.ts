import {
  ContentSource,
  DischargeDomain,
  DocumentType,
  DomainStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/server/db/client";
import { generateWithProvider } from "@/server/ai/orchestrator";
import {
  DischargePlanJsonSchema,
  ReadinessSummaryJsonSchema,
} from "@/server/ai/schemas/discharge-plan.schema";
import { loadEncounterContext } from "@/server/modules/encounters/encounter.service";
import { createAuditEvent } from "@/server/modules/audit/audit.service";
import { validateAiOutput } from "@/server/policy/discharge-policy";
import { createBlocker } from "@/server/modules/blockers/blocker.service";
import { createTask } from "@/server/modules/tasks/task.service";
import { buildAiInput } from "@/server/ai/build-ai-input";

export async function generateReadinessSummary(encounterId: string, actorId: string, userRole: UserRole) {
  const context = await loadEncounterContext(encounterId);
  const input = buildAiInput(context, userRole, "READINESS_SUMMARY");

  const summary = await generateWithProvider((provider) => provider.generateReadinessSummary(input));
  ReadinessSummaryJsonSchema.parse(summary);
  validateAiOutput(summary);

  await createAuditEvent({
    actorId,
    patientId: context.patientId,
    encounterId,
    eventType: "AI_READINESS_GENERATED",
    entityType: "AIOutput",
    after: summary,
    source: "AI",
    metadata: { provider: process.env.AI_PROVIDER ?? "mock" },
  });

  return summary;
}

export async function generateAndPersistDischargePlan(encounterId: string, actorId: string, userRole: UserRole) {
  const context = await loadEncounterContext(encounterId);

  if (!context.clinicalSnapshots[0]) {
    throw new Error("Clinical data snapshot unavailable — refresh EPR data or use mock snapshot before generating AI plan");
  }

  const input = buildAiInput(context, userRole, "DISCHARGE_PLAN");
  const planJson = await generateWithProvider((provider) => provider.generateDischargePlan(input));
  DischargePlanJsonSchema.parse(planJson);
  validateAiOutput(planJson);

  const plan = await prisma.dischargePlan.create({
    data: {
      patientId: context.patientId,
      encounterId,
      generatedBy: "AI",
      overallStatus: planJson.overallStatus as DomainStatus,
      summary: planJson.summary,
      readinessRationale: planJson.readinessRationale,
      missingInformation: planJson.missingInformation,
      safetyConcerns: planJson.safetyConcerns,
      uncertainty: planJson.uncertainty,
      confidence: planJson.confidence,
      humanApprovalRequired: true,
      finalDecisionRequired: true,
      approvalStatus: "DRAFT",
      aiOutputRaw: planJson,
      domainStatuses: {
        create: planJson.domains.map((d) => ({
          domain: d.domain as DischargeDomain,
          status: d.status as DomainStatus,
          ownerRole: d.ownerRole as UserRole,
          summary: d.summary,
          actionRequired: d.actionRequired,
          rationale: d.rationale,
          confidence: d.confidence,
        })),
      },
    },
    include: { domainStatuses: true },
  });

  for (const answer of context.answers.slice(0, 5)) {
    await prisma.sourceEvidence.create({
      data: {
        patientId: context.patientId,
        encounterId,
        dischargePlanId: plan.id,
        sourceSystem: "QUESTIONNAIRE",
        sourceType: "DischargeAnswer",
        sourceId: answer.id,
        label: answer.question.questionText,
        excerpt: JSON.stringify(answer.value),
      },
    });
  }

  if (context.clinicalSnapshots[0]) {
    await prisma.sourceEvidence.create({
      data: {
        patientId: context.patientId,
        encounterId,
        dischargePlanId: plan.id,
        sourceSystem: "MOCK_EPR",
        sourceType: "ClinicalDataSnapshot",
        sourceId: context.clinicalSnapshots[0].id,
        label: "Clinical snapshot",
        excerpt: `NEWS2: ${context.clinicalSnapshots[0].news2Score ?? "N/A"}`,
      },
    });
  }

  for (const task of planJson.tasks) {
    await createTask({
      encounterId,
      domain: task.domain as DischargeDomain,
      title: task.title,
      description: task.description,
      ownerRole: task.ownerRole as UserRole,
      priority: task.priority,
      proposedByAi: true,
      dischargePlanId: plan.id,
      actorId,
    });
  }

  for (const blocker of planJson.blockers) {
    await createBlocker({
      encounterId,
      domain: blocker.domain as DischargeDomain,
      title: blocker.title,
      description: blocker.description,
      severity: blocker.severity,
      ownerRole: blocker.ownerRole as UserRole,
      escalationRoute: blocker.escalationRoute,
      proposedByAi: true,
      dischargePlanId: plan.id,
      actorId,
    });
  }

  for (const doc of planJson.draftDocuments) {
    await prisma.draftDocument.create({
      data: {
        patientId: context.patientId,
        encounterId,
        dischargePlanId: plan.id,
        type: doc.type as DocumentType,
        title: doc.title,
        content: doc.content,
        generatedBy: "AI",
        status: "DRAFT",
      },
    });
  }

  await createAuditEvent({
    actorId,
    patientId: context.patientId,
    encounterId,
    eventType: "AI_DISCHARGE_PLAN_GENERATED",
    entityType: "DischargePlan",
    entityId: plan.id,
    after: { overallStatus: plan.overallStatus, summary: plan.summary },
    source: "AI",
    metadata: { provider: process.env.AI_PROVIDER ?? "mock", confidence: plan.confidence },
  });

  await prisma.metricEvent.create({
    data: {
      eventType: "ai_plan_generated",
      ward: context.ward,
      encounterId,
      metadata: { confidence: plan.confidence, blockerCount: planJson.blockers.length },
    },
  });

  return prisma.dischargePlan.findUnique({
    where: { id: plan.id },
    include: {
      domainStatuses: true,
      tasks: true,
      blockers: true,
      draftDocuments: true,
      sourceEvidence: true,
    },
  });
}

export async function acceptAiPlan(planId: string, actorId: string) {
  const plan = await prisma.dischargePlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");

  await prisma.dischargeTask.updateMany({
    where: { dischargePlanId: planId, proposedByAi: true },
    data: { acceptedFromAi: true },
  });
  await prisma.blocker.updateMany({
    where: { dischargePlanId: planId, proposedByAi: true },
    data: { acceptedFromAi: true },
  });

  await createAuditEvent({
    actorId,
    patientId: plan.patientId,
    encounterId: plan.encounterId,
    eventType: "AI_SUGGESTION_ACCEPTED",
    entityType: "DischargePlan",
    entityId: planId,
    source: "HUMAN",
  });

  return plan;
}

export async function rejectAiPlan(planId: string, actorId: string, reason?: string) {
  const plan = await prisma.dischargePlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");

  await createAuditEvent({
    actorId,
    patientId: plan.patientId,
    encounterId: plan.encounterId,
    eventType: "AI_SUGGESTION_REJECTED",
    entityType: "DischargePlan",
    entityId: planId,
    metadata: { reason },
    source: "HUMAN",
  });

  await prisma.aiFeedback.create({
    data: {
      patientId: plan.patientId,
      encounterId: plan.encounterId,
      dischargePlanId: planId,
      userId: actorId,
      outputType: "DISCHARGE_PLAN",
      outcome: "REJECTED",
      reason,
    },
  });

  return { success: true };
}

export async function getLatestPlan(encounterId: string) {
  return prisma.dischargePlan.findFirst({
    where: { encounterId },
    orderBy: { createdAt: "desc" },
    include: {
      domainStatuses: true,
      tasks: true,
      blockers: true,
      draftDocuments: true,
      sourceEvidence: true,
      approvedBy: { select: { id: true, name: true, role: true } },
    },
  });
}
