import {
  DischargeDomain,
  DocumentType,
  DomainStatus,
  UserRole,
} from "@prisma/client";
import {
  DischargePlanJson,
  ReadinessSummaryJson,
} from "../schemas/discharge-plan.schema";
import { AiInput, AiProvider } from "../types";

function getAnswerValue(answers: AiInput["answers"], domain: string, keyword: string): string | null {
  const match = answers.find(
    (a) => a.domain === domain && a.questionText.toLowerCase().includes(keyword.toLowerCase())
  );
  if (!match?.value || typeof match.value !== "object") return null;
  const val = (match.value as { answer?: string }).answer;
  return val ?? null;
}

function scanFreeText(notes: AiInput["freeTextNotes"], keywords: string[]): boolean {
  const text = notes.map((n) => n.text.toLowerCase()).join(" ");
  return keywords.some((k) => text.includes(k.toLowerCase()));
}

function deriveDomainStatus(answer: string | null, blockKeywords: boolean): DomainStatus {
  if (blockKeywords) return "RED";
  if (answer === "yes") return "GREEN";
  if (answer === "no") return "RED";
  if (answer === "unknown" || !answer) return "AMBER";
  return "AMBER";
}

export class MockAiProvider implements AiProvider {
  async generateReadinessSummary(input: AiInput): Promise<ReadinessSummaryJson> {
    const plan = await this.generateDischargePlan(input);
    return {
      overallStatus: plan.overallStatus,
      summary: plan.summary,
      keyPoints: plan.readinessRationale.map((r) => r.statement),
      missingInformation: plan.missingInformation,
      safetyConcerns: plan.safetyConcerns,
      confidence: plan.confidence,
      uncertainty: plan.uncertainty,
      finalDecisionRequired: true,
      humanApprovalRequired: true,
    };
  }

  async generateDischargePlan(input: AiInput): Promise<DischargePlanJson> {
    const medicalFit = getAnswerValue(input.answers, "MEDICAL_READINESS", "medically fit");
    const ttoDone = getAnswerValue(input.answers, "MEDICINES", "TTO");
    const pharmacyScreen = getAnswerValue(input.answers, "MEDICINES", "pharmacy");
    const otClear = getAnswerValue(input.answers, "THERAPY_AND_MOBILITY", "occupational therapy");
    const ptClear = getAnswerValue(input.answers, "THERAPY_AND_MOBILITY", "physiotherapy");
    const carePackage = getAnswerValue(input.answers, "HOME_AND_CARE", "package of care");
    const careConfirmed = getAnswerValue(input.answers, "HOME_AND_CARE", "confirmed");
    const transportNeed = getAnswerValue(input.answers, "TRANSPORT", "hospital transport");
    const familyUpdated = getAnswerValue(input.answers, "FAMILY_COMMUNICATION", "next of kin");

    const ttoBlocked = scanFreeText(input.freeTextNotes, ["tto", "not yet screened", "prescription"]);
    const otBlocked = scanFreeText(input.freeTextNotes, ["ot", "stair assessment", "occupational"]);
    const transportBlocked = scanFreeText(input.freeTextNotes, ["transport", "ambulance"]);

    const domains = [
      {
        domain: "MEDICAL_READINESS" as DischargeDomain,
        status: deriveDomainStatus(medicalFit, false),
        ownerRole: "DOCTOR" as UserRole,
        summary: medicalFit === "yes" ? "Structured answer suggests medical fitness may be achievable today — requires clinician confirmation." : "Medical fitness not confirmed.",
        actionRequired: medicalFit !== "yes" ? "Doctor to confirm medical fitness and outstanding clinical issues." : "Confirm consultant review if indicated.",
        rationale: "Based on structured medical readiness answers.",
        confidence: medicalFit ? 0.75 : 0.45,
        sourceEvidenceIds: input.answers.filter((a) => a.domain === "MEDICAL_READINESS").map((a) => a.id),
      },
      {
        domain: "MEDICINES" as DischargeDomain,
        status: deriveDomainStatus(ttoDone, ttoBlocked || pharmacyScreen === "no"),
        ownerRole: "PHARMACIST" as UserRole,
        summary: ttoBlocked ? "TTO/pharmacy screening appears outstanding." : "Medicines pathway progressing.",
        actionRequired: "Complete TTO and pharmacy screen.",
        rationale: "Structured medicines answers and free-text context.",
        confidence: 0.7,
        sourceEvidenceIds: input.answers.filter((a) => a.domain === "MEDICINES").map((a) => a.id),
      },
      {
        domain: "THERAPY_AND_MOBILITY" as DischargeDomain,
        status: deriveDomainStatus(otClear, otBlocked || otClear === "no"),
        ownerRole: "OCCUPATIONAL_THERAPIST" as UserRole,
        summary: otBlocked ? "OT/stair assessment may be pending." : "Therapy clearance status recorded.",
        actionRequired: otBlocked || otClear !== "yes" ? "Confirm OT/PT clearance and mobility safety." : undefined,
        rationale: "Therapy questionnaire and notes.",
        confidence: 0.68,
        sourceEvidenceIds: input.answers.filter((a) => a.domain === "THERAPY_AND_MOBILITY").map((a) => a.id),
      },
      {
        domain: "HOME_AND_CARE" as DischargeDomain,
        status: carePackage === "yes" && careConfirmed !== "yes" ? "RED" : deriveDomainStatus(careConfirmed, false),
        ownerRole: "DISCHARGE_COORDINATOR" as UserRole,
        summary: "Home and care needs require coordinator confirmation.",
        actionRequired: carePackage === "yes" ? "Confirm care package restart." : undefined,
        rationale: "Home and care structured answers.",
        confidence: 0.65,
        sourceEvidenceIds: input.answers.filter((a) => a.domain === "HOME_AND_CARE").map((a) => a.id),
      },
      {
        domain: "TRANSPORT" as DischargeDomain,
        status: deriveDomainStatus(transportNeed, transportBlocked),
        ownerRole: "NURSE" as UserRole,
        summary: transportBlocked ? "Transport arrangements may be incomplete." : "Transport pathway documented.",
        actionRequired: transportBlocked ? "Confirm transport booking or family collection." : undefined,
        rationale: "Transport answers and notes.",
        confidence: 0.72,
        sourceEvidenceIds: input.answers.filter((a) => a.domain === "TRANSPORT").map((a) => a.id),
      },
      {
        domain: "FAMILY_COMMUNICATION" as DischargeDomain,
        status: deriveDomainStatus(familyUpdated, false),
        ownerRole: "NURSE" as UserRole,
        summary: familyUpdated === "yes" ? "Family communication documented." : "Family update may be pending.",
        actionRequired: familyUpdated !== "yes" ? "Update patient and next of kin." : undefined,
        rationale: "Family communication answers.",
        confidence: 0.8,
        sourceEvidenceIds: input.answers.filter((a) => a.domain === "FAMILY_COMMUNICATION").map((a) => a.id),
      },
      {
        domain: "DOCUMENTATION" as DischargeDomain,
        status: "AMBER" as DomainStatus,
        ownerRole: "DOCTOR" as UserRole,
        summary: "Discharge summary draft can be generated for clinician review.",
        actionRequired: "Review AI draft discharge summary.",
        rationale: "Documentation workflow.",
        confidence: 0.6,
        sourceEvidenceIds: [],
      },
    ];

    const statuses = domains.map((d) => d.status);
    const overallStatus: DomainStatus = statuses.includes("RED")
      ? "RED"
      : statuses.includes("AMBER")
        ? "AMBER"
        : statuses.every((s) => s === "GREEN" || s === "BLUE")
          ? "AMBER"
          : "GREY";

    const blockers = [];
    if (ttoBlocked || ttoDone === "no" || pharmacyScreen === "no") {
      blockers.push({
        domain: "MEDICINES",
        title: "TTO/pharmacy screening incomplete",
        description: "Discharge prescription requires completion and pharmacist screening.",
        severity: "HIGH" as const,
        status: "BLOCKED" as const,
        ownerRole: "PHARMACIST",
        escalationRoute: "Notify ward pharmacist and discharge coordinator if unresolved within 3 hours.",
      });
    }
    if (otBlocked || otClear === "no") {
      blockers.push({
        domain: "THERAPY_AND_MOBILITY",
        title: "Awaiting OT/PT clearance",
        description: "Patient safety with transfers/stairs requires therapy sign-off.",
        severity: "HIGH" as const,
        status: "BLOCKED" as const,
        ownerRole: "OCCUPATIONAL_THERAPIST",
        escalationRoute: "Notify discharge coordinator if unresolved by 14:00.",
      });
    }
    if (carePackage === "yes" && careConfirmed !== "yes") {
      blockers.push({
        domain: "HOME_AND_CARE",
        title: "Care package not confirmed",
        description: "Community care package restart requires confirmation.",
        severity: "HIGH" as const,
        status: "BLOCKED" as const,
        ownerRole: "DISCHARGE_COORDINATOR",
        escalationRoute: "Escalate to discharge coordinator and social care team.",
      });
    }

    const tasks = blockers.map((b) => ({
      domain: b.domain,
      title: b.title,
      description: b.description,
      status: "NOT_STARTED" as const,
      ownerRole: b.ownerRole,
      priority: "HIGH" as const,
      dueAt: null,
    }));

    const missingInformation: Array<{
      domain: string;
      question: string;
      requiredRole: string;
      priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    }> = input.answers.length < 10
      ? [{ domain: "MEDICAL_READINESS", question: "Complete remaining structured discharge questions.", requiredRole: "DOCTOR", priority: "HIGH" }]
      : [];

    if (familyUpdated !== "yes") {
      missingInformation.push({
        domain: "FAMILY_COMMUNICATION",
        question: "Has next of kin been updated?",
        requiredRole: "NURSE",
        priority: "MEDIUM" as const,
      });
    }

    const uncertainty: string[] = [];
    if (medicalFit !== "yes") uncertainty.push("Medical fitness is not confirmed by an authorised clinician.");
    if (transportBlocked) uncertainty.push("Transport status is unclear.");
    if (!input.snapshot) uncertainty.push("Clinical data snapshot may be stale or unavailable.");

    const patientName = `${input.patient.firstName} ${input.patient.lastName}`;

    return {
      overallStatus,
      summary: `AI draft assessment: ${patientName} may be dischargeable today if outstanding blockers are resolved. This is not a clinical decision — authorised clinician approval required.`,
      readinessRationale: [
        { statement: `Patient on ${input.encounter.ward} bed ${input.encounter.bed} under ${input.encounter.consultantName}.`, type: "fact" as const, sourceEvidenceIds: input.snapshot ? ["snapshot"] : [] },
        ...blockers.map((b) => ({ statement: b.title, type: "fact" as const, sourceEvidenceIds: [] as string[] })),
      ],
      domains,
      tasks,
      blockers,
      missingInformation,
      safetyConcerns: ttoBlocked
        ? [{ domain: "MEDICINES", concern: "High-risk medication counselling status may be unclear.", severity: "MEDIUM" as const, recommendedAction: "Pharmacist or doctor to confirm counselling before discharge." }]
        : [],
      draftDocuments: [
        {
          type: "DISCHARGE_SUMMARY",
          title: "Draft discharge summary",
          content: this.buildDischargeSummary(input, overallStatus),
        },
      ],
      confidence: Math.max(0.45, 0.85 - blockers.length * 0.08),
      uncertainty,
      finalDecisionRequired: true,
      humanApprovalRequired: true,
    };
  }

  async generateDraftDocument(input: AiInput, type: DocumentType) {
    const plan = await this.generateDischargePlan(input);
    const doc = plan.draftDocuments.find((d) => d.type === type) ?? plan.draftDocuments[0];
    return doc ?? {
      type,
      title: "Draft document",
      content: "Draft only. Requires clinician review.",
    };
  }

  private buildDischargeSummary(input: AiInput, status: DomainStatus): string {
    const dx = (input.snapshot?.diagnoses as string[] | undefined)?.join(", ") ?? "See clinical record";
    return `DRAFT DISCHARGE SUMMARY — REQUIRES CLINICIAN REVIEW

Patient: ${input.patient.firstName} ${input.patient.lastName}
NHS Number: ${input.patient.nhsNumber}
Ward/Bed: ${input.encounter.ward} / ${input.encounter.bed}
Consultant: ${input.encounter.consultantName}
Admission date: ${input.encounter.admissionDate.toISOString().split("T")[0]}

Diagnosis: ${dx}

AI-assessed discharge readiness: ${status}
This document is a draft generated by Discharge AI and must be reviewed, edited, and approved by an authorised clinician before use.

Plan summary:
${input.freeTextNotes.map((n) => `- ${n.text}`).join("\n") || "- No additional free-text context recorded."}

Follow-up: To be confirmed by responsible clinician.
Safety-netting: To be confirmed by responsible clinician.

[End of draft — not for clinical use until approved]`;
  }
}
