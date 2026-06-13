import { UserRole } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { canAnswerQuestion } from "@/server/auth/permissions";
import { createAuditEvent } from "@/server/modules/audit/audit.service";

export async function listQuestions(encounterId: string) {
  const [questions, answers] = await Promise.all([
    prisma.dischargeQuestion.findMany({
      where: { active: true },
      orderBy: [{ domain: "asc" }, { order: "asc" }],
    }),
    prisma.dischargeAnswer.findMany({
      where: { encounterId },
      include: { answeredBy: { select: { id: true, name: true, role: true } } },
    }),
  ]);

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  return questions.map((q) => ({
    ...q,
    answer: answerMap.get(q.id) ?? null,
  }));
}

export async function upsertAnswer(input: {
  encounterId: string;
  questionId: string;
  value: unknown;
  notes?: string;
  userId: string;
  userRole: UserRole;
}) {
  const question = await prisma.dischargeQuestion.findUnique({ where: { id: input.questionId } });
  if (!question) throw new Error("Question not found");

  if (!canAnswerQuestion(input.userRole, question.requiredRole)) {
    throw new Error("You do not have permission to answer this question");
  }

  const encounter = await prisma.encounter.findUnique({ where: { id: input.encounterId } });
  if (!encounter) throw new Error("Encounter not found");

  const existing = await prisma.dischargeAnswer.findUnique({
    where: { questionId_encounterId: { questionId: input.questionId, encounterId: input.encounterId } },
  });

  const answer = await prisma.dischargeAnswer.upsert({
    where: { questionId_encounterId: { questionId: input.questionId, encounterId: input.encounterId } },
    create: {
      questionId: input.questionId,
      patientId: encounter.patientId,
      encounterId: input.encounterId,
      answeredById: input.userId,
      value: input.value as object,
      notes: input.notes,
    },
    update: {
      value: input.value as object,
      notes: input.notes,
      answeredById: input.userId,
    },
    include: { answeredBy: { select: { id: true, name: true, role: true } }, question: true },
  });

  await createAuditEvent({
    actorId: input.userId,
    patientId: encounter.patientId,
    encounterId: input.encounterId,
    eventType: "ANSWER_UPSERTED",
    entityType: "DischargeAnswer",
    entityId: answer.id,
    before: existing ? { value: existing.value, notes: existing.notes } : undefined,
    after: { value: answer.value, notes: answer.notes },
    metadata: { questionId: question.id, domain: question.domain },
  });

  return answer;
}

export async function createFreeTextNote(input: {
  encounterId: string;
  text: string;
  userId: string;
}) {
  const encounter = await prisma.encounter.findUnique({ where: { id: input.encounterId } });
  if (!encounter) throw new Error("Encounter not found");

  const note = await prisma.freeTextNote.create({
    data: {
      patientId: encounter.patientId,
      encounterId: input.encounterId,
      authorId: input.userId,
      text: input.text,
    },
    include: { author: { select: { id: true, name: true, role: true } } },
  });

  await createAuditEvent({
    actorId: input.userId,
    patientId: encounter.patientId,
    encounterId: input.encounterId,
    eventType: "FREE_TEXT_NOTE_CREATED",
    entityType: "FreeTextNote",
    entityId: note.id,
    after: { text: note.text },
  });

  return note;
}

export async function listFreeTextNotes(encounterId: string) {
  return prisma.freeTextNote.findMany({
    where: { encounterId },
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });
}
