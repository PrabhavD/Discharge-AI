import { PrismaClient } from "@prisma/client";

export const JANE_DEMO_ENCOUNTER_ID = "enc-H001";
export const JANE_DEMO_BLOCKER_ID = "blk-H001";
export const JANE_DEMO_PATIENT_HOSPITAL = "H001";

const prisma = new PrismaClient();

export async function resetJaneDemoEncounter() {
  const encounterId = JANE_DEMO_ENCOUNTER_ID;

  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    include: { patient: true },
  });
  if (!encounter) {
    throw new Error(`Encounter ${encounterId} not found — run npm run db:seed first`);
  }

  const planIds = (
    await prisma.dischargePlan.findMany({
      where: { encounterId },
      select: { id: true },
    })
  ).map((p) => p.id);

  await prisma.approval.deleteMany({ where: { encounterId } });
  await prisma.aiFeedback.deleteMany({ where: { encounterId } });
  await prisma.sourceEvidence.deleteMany({ where: { encounterId } });
  await prisma.draftDocument.deleteMany({ where: { encounterId } });

  if (planIds.length > 0) {
    await prisma.dischargeDomainStatus.deleteMany({
      where: { dischargePlanId: { in: planIds } },
    });
  }

  await prisma.dischargeTask.deleteMany({ where: { encounterId } });
  await prisma.blocker.deleteMany({ where: { encounterId } });
  await prisma.dischargePlan.deleteMany({ where: { encounterId } });
  await prisma.auditEvent.deleteMany({ where: { encounterId } });

  const doctor = await prisma.user.findFirst({ where: { role: "DOCTOR" } });
  const questions = await prisma.dischargeQuestion.findMany();

  const ttoQ = questions.find((q) => q.questionText.includes("TTO"));
  const medicalFitQ = questions.find((q) => q.questionText.includes("medically fit"));

  if (medicalFitQ && doctor) {
    await prisma.dischargeAnswer.upsert({
      where: {
        questionId_encounterId: { questionId: medicalFitQ.id, encounterId },
      },
      update: { value: { answer: "yes" }, answeredById: doctor.id },
      create: {
        questionId: medicalFitQ.id,
        patientId: encounter.patientId,
        encounterId,
        answeredById: doctor.id,
        value: { answer: "yes" },
      },
    });
  }

  if (ttoQ && doctor) {
    await prisma.dischargeAnswer.upsert({
      where: {
        questionId_encounterId: { questionId: ttoQ.id, encounterId },
      },
      update: { value: { answer: "no" }, answeredById: doctor.id },
      create: {
        questionId: ttoQ.id,
        patientId: encounter.patientId,
        encounterId,
        answeredById: doctor.id,
        value: { answer: "no" },
      },
    });
  }

  await prisma.blocker.upsert({
    where: { id: JANE_DEMO_BLOCKER_ID },
    update: {
      status: "BLOCKED",
      resolvedAt: null,
      title: "TTO not screened",
      description: "Discharge prescription awaiting pharmacy screening",
      severity: "HIGH",
      dischargePlanId: null,
      proposedByAi: false,
      acceptedFromAi: false,
    },
    create: {
      id: JANE_DEMO_BLOCKER_ID,
      patientId: encounter.patientId,
      encounterId,
      domain: "MEDICINES",
      title: "TTO not screened",
      description: "Discharge prescription awaiting pharmacy screening",
      severity: "HIGH",
      status: "BLOCKED",
      ownerRole: "PHARMACIST",
    },
  });

  await prisma.freeTextNote.upsert({
    where: { id: `note-${JANE_DEMO_PATIENT_HOSPITAL}` },
    update: { text: "Patient otherwise ready for discharge. Daughter can collect after 5pm." },
    create: {
      id: `note-${JANE_DEMO_PATIENT_HOSPITAL}`,
      patientId: encounter.patientId,
      encounterId,
      authorId: doctor!.id,
      text: "Patient otherwise ready for discharge. Daughter can collect after 5pm.",
    },
  });

  return { encounterId, patientId: encounter.patientId };
}

async function main() {
  const result = await resetJaneDemoEncounter();
  console.log(`Reset Jane Demo encounter: ${result.encounterId}`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { prisma as testPrisma };
