import { ApprovalStatus, DomainStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { loadEncounterContext } from "@/server/modules/encounters/encounter.service";

export interface ApprovalValidationResult {
  canApprove: boolean;
  errors: string[];
  warnings: string[];
}

export async function validatePlanApproval(
  dischargePlanId: string,
  overrideReason?: string
): Promise<ApprovalValidationResult> {
  const plan = await prisma.dischargePlan.findUnique({
    where: { id: dischargePlanId },
    include: {
      domainStatuses: true,
      blockers: { where: { status: { not: "DONE" } } },
      draftDocuments: { where: { type: "DISCHARGE_SUMMARY" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!plan) return { canApprove: false, errors: ["Discharge plan not found"], warnings: [] };

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!plan.humanApprovalRequired) {
    errors.push("Plan does not require human approval — invalid state");
  }

  const redDomains = plan.domainStatuses.filter((d) => d.status === "RED");
  if (redDomains.length > 0 && !overrideReason) {
    errors.push(`Outstanding RED domains require override comment: ${redDomains.map((d) => d.domain).join(", ")}`);
  }

  const activeBlockers = plan.blockers.filter((b) => b.status !== "DONE");
  if (activeBlockers.some((b) => b.severity === "CRITICAL" || b.severity === "HIGH") && !overrideReason) {
    errors.push("High-severity blockers remain unresolved");
  }

  const summary = plan.draftDocuments[0];
  if (!summary || summary.status !== "APPROVED") {
    errors.push("Draft discharge summary must be approved before final plan approval");
  }

  const encounter = await loadEncounterContext(plan.encounterId);
  const requiredQuestions = await prisma.dischargeQuestion.findMany({ where: { isRequired: true, active: true } });
  const answeredIds = new Set(encounter.answers.map((a) => a.questionId));
  const missingRequired = requiredQuestions.filter((q) => !answeredIds.has(q.id));
  if (missingRequired.length > 0) {
    warnings.push(`${missingRequired.length} required questionnaire items remain unanswered`);
  }

  if (plan.confidence < 0.5) {
    warnings.push("AI confidence is low — review uncertainty section carefully");
  }

  return { canApprove: errors.length === 0, errors, warnings };
}

export function validateAiOutput(plan: { humanApprovalRequired?: boolean; finalDecisionRequired?: boolean; overallStatus?: DomainStatus }) {
  if (plan.humanApprovalRequired === false) {
    throw new Error("AI output cannot set humanApprovalRequired to false");
  }
  if (plan.finalDecisionRequired === false) {
    throw new Error("AI output cannot set finalDecisionRequired to false");
  }
}

export async function validateDocumentApproval(documentId: string) {
  const doc = await prisma.draftDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { canApprove: false, errors: ["Document not found"] };
  if (doc.content.trim().length < 20) {
    return { canApprove: false, errors: ["Document content too short for approval"] };
  }
  return { canApprove: true, errors: [] as string[] };
}

export async function getApprovalChecklist(encounterId: string) {
  const encounter = await loadEncounterContext(encounterId);
  const plan = encounter.dischargePlans[0];
  const summary = encounter.draftDocuments.find((d) => d.type === "DISCHARGE_SUMMARY");
  const activeBlockers = encounter.blockers.filter((b) => b.status !== "DONE");

  return {
    planApprovalStatus: plan?.approvalStatus ?? "DRAFT",
    summaryApprovalStatus: summary?.status ?? "DRAFT",
    overallStatus: plan?.overallStatus ?? "GREY",
    activeBlockerCount: activeBlockers.length,
    requiredQuestionsAnswered: encounter.answers.length,
    hasPlan: !!plan,
    hasSummary: !!summary,
    canProceed: !!plan && !!summary,
  };
}

export function assertApprovalStatusTransition(current: ApprovalStatus, next: ApprovalStatus) {
  const allowed: Record<ApprovalStatus, ApprovalStatus[]> = {
    DRAFT: ["PENDING_REVIEW", "REJECTED"],
    PENDING_REVIEW: ["APPROVED", "REJECTED", "CHANGES_REQUESTED"],
    APPROVED: [],
    REJECTED: ["DRAFT"],
    CHANGES_REQUESTED: ["DRAFT", "PENDING_REVIEW"],
  };
  if (!allowed[current]?.includes(next)) {
    throw new Error(`Invalid approval transition from ${current} to ${next}`);
  }
}
