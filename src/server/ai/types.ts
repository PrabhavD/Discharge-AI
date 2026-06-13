import { DocumentType, UserRole } from "@prisma/client";
import { DischargePlanJson, ReadinessSummaryJson } from "./schemas/discharge-plan.schema";

export interface AiInput {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    nhsNumber: string;
    dateOfBirth: Date;
  };
  encounter: {
    id: string;
    ward: string;
    bed: string;
    specialty: string;
    consultantName: string;
    admissionDate: Date;
    expectedDischargeDate: Date | null;
  };
  snapshot: Record<string, unknown> | null;
  answers: Array<{
    id: string;
    questionId: string;
    domain: string;
    questionText: string;
    value: unknown;
  }>;
  freeTextNotes: Array<{ id: string; text: string; authorName: string }>;
  existingTasks: Array<{ title: string; status: string; domain: string }>;
  existingBlockers: Array<{ title: string; severity: string; domain: string }>;
  userRole: UserRole;
  outputType: "READINESS_SUMMARY" | "DISCHARGE_PLAN" | "DRAFT_DOCUMENT";
  documentType?: DocumentType;
}

export interface AiProvider {
  generateReadinessSummary(input: AiInput): Promise<ReadinessSummaryJson>;
  generateDischargePlan(input: AiInput): Promise<DischargePlanJson>;
  generateDraftDocument(input: AiInput, type: DocumentType): Promise<{ type: string; title: string; content: string }>;
}
