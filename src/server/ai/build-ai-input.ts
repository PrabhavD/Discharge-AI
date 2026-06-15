import { UserRole } from "@prisma/client";
import { AiInput } from "@/server/ai/types";
import { loadEncounterContext } from "@/server/modules/encounters/encounter.service";

export function buildSnapshotForAi(snapshot: NonNullable<Awaited<ReturnType<typeof loadEncounterContext>>["clinicalSnapshots"][0]>) {
  return {
    diagnoses: snapshot.diagnoses,
    problemList: snapshot.problemList,
    news2Score: snapshot.news2Score,
    observations: snapshot.observations,
    bloodResults: snapshot.bloodResults,
    imagingReports: snapshot.imagingReports,
    currentMedications: snapshot.currentMedications,
    allergies: snapshot.allergies,
    therapyNotes: snapshot.therapyNotes,
    nursingNotes: snapshot.nursingNotes,
    socialHistory: snapshot.socialHistory,
    pendingInvestigations: snapshot.pendingInvestigations,
    frailtyScore: snapshot.frailtyScore,
    rawPayload: snapshot.rawPayload,
  };
}

export function buildAiInput(
  context: Awaited<ReturnType<typeof loadEncounterContext>>,
  userRole: UserRole,
  outputType: AiInput["outputType"] = "DISCHARGE_PLAN"
): AiInput {
  const snapshot = context.clinicalSnapshots[0];
  return {
    patient: {
      id: context.patient.id,
      firstName: context.patient.firstName,
      lastName: context.patient.lastName,
      nhsNumber: context.patient.nhsNumber,
      dateOfBirth: context.patient.dateOfBirth,
    },
    encounter: {
      id: context.id,
      ward: context.ward,
      bed: context.bed,
      specialty: context.specialty,
      consultantName: context.consultantName,
      admissionDate: context.admissionDate,
      expectedDischargeDate: context.expectedDischargeDate,
    },
    snapshot: snapshot ? buildSnapshotForAi(snapshot) : null,
    answers: context.answers.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      domain: a.question.domain,
      questionText: a.question.questionText,
      value: a.value,
    })),
    freeTextNotes: context.freeTextNotes.map((n) => ({
      id: n.id,
      text: n.text,
      authorName: n.author.name,
    })),
    existingTasks: context.tasks.map((t) => ({ title: t.title, status: t.status, domain: t.domain })),
    existingBlockers: context.blockers.map((b) => ({ title: b.title, severity: b.severity, domain: b.domain })),
    userRole,
    outputType,
  };
}
