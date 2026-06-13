import {
  DischargeDomain,
  PrismaClient,
  QuestionType,
  UserRole,
} from "@prisma/client";
import { DEV_USERS } from "../src/server/auth/dev-users";

const prisma = new PrismaClient();

const QUESTIONS: Array<{
  domain: DischargeDomain;
  questionText: string;
  questionType: QuestionType;
  requiredRole: UserRole;
  order: number;
  selectOptions?: string[];
}> = [
  { domain: "MEDICAL_READINESS", questionText: "Is the patient medically fit for discharge today?", questionType: "YES_NO_UNKNOWN", requiredRole: "DOCTOR", order: 1 },
  { domain: "MEDICAL_READINESS", questionText: "Are there unresolved clinical issues?", questionType: "YES_NO_UNKNOWN", requiredRole: "DOCTOR", order: 2 },
  { domain: "MEDICAL_READINESS", questionText: "Are any investigations pending before discharge?", questionType: "YES_NO_UNKNOWN", requiredRole: "DOCTOR", order: 3 },
  { domain: "MEDICAL_READINESS", questionText: "Is consultant review required?", questionType: "YES_NO_UNKNOWN", requiredRole: "DOCTOR", order: 4 },
  { domain: "MEDICAL_READINESS", questionText: "Is a follow-up appointment required?", questionType: "YES_NO_UNKNOWN", requiredRole: "DOCTOR", order: 5 },
  { domain: "MEDICAL_READINESS", questionText: "Are red flags and safety-netting instructions documented?", questionType: "YES_NO_UNKNOWN", requiredRole: "DOCTOR", order: 6 },
  { domain: "HOME_AND_CARE", questionText: "Can the patient return to their usual residence?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 1 },
  { domain: "HOME_AND_CARE", questionText: "Does the patient live alone?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 2 },
  { domain: "HOME_AND_CARE", questionText: "Is a package of care required?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 3 },
  { domain: "HOME_AND_CARE", questionText: "Has the package of care been confirmed?", questionType: "YES_NO_UNKNOWN", requiredRole: "DISCHARGE_COORDINATOR", order: 4 },
  { domain: "HOME_AND_CARE", questionText: "Are carers or family aware of the plan?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 5 },
  { domain: "HOME_AND_CARE", questionText: "Is home equipment required?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 6 },
  { domain: "THERAPY_AND_MOBILITY", questionText: "Has physiotherapy cleared the patient?", questionType: "YES_NO_UNKNOWN", requiredRole: "PHYSIOTHERAPIST", order: 1 },
  { domain: "THERAPY_AND_MOBILITY", questionText: "Has occupational therapy cleared the patient?", questionType: "YES_NO_UNKNOWN", requiredRole: "OCCUPATIONAL_THERAPIST", order: 2 },
  { domain: "THERAPY_AND_MOBILITY", questionText: "Is the patient safe with transfers?", questionType: "YES_NO_UNKNOWN", requiredRole: "OCCUPATIONAL_THERAPIST", order: 3 },
  { domain: "THERAPY_AND_MOBILITY", questionText: "Is the patient safe with stairs?", questionType: "YES_NO_UNKNOWN", requiredRole: "OCCUPATIONAL_THERAPIST", order: 4 },
  { domain: "THERAPY_AND_MOBILITY", questionText: "Is the patient safe with toileting?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 5 },
  { domain: "THERAPY_AND_MOBILITY", questionText: "Is the patient safe with feeding?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 6 },
  { domain: "THERAPY_AND_MOBILITY", questionText: "Are mobility aids required?", questionType: "YES_NO_UNKNOWN", requiredRole: "OCCUPATIONAL_THERAPIST", order: 7 },
  { domain: "TRANSPORT", questionText: "Does the patient need hospital transport?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 1 },
  { domain: "TRANSPORT", questionText: "Can family collect?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 2 },
  { domain: "TRANSPORT", questionText: "Is ambulance transport required?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 3 },
  { domain: "TRANSPORT", questionText: "What is the discharge destination?", questionType: "SELECT", requiredRole: "NURSE", order: 4, selectOptions: ["Home", "Care home", "Rehab", "Another hospital"] },
  { domain: "MEDICINES", questionText: "Has medicines reconciliation been completed?", questionType: "YES_NO_UNKNOWN", requiredRole: "PHARMACIST", order: 1 },
  { domain: "MEDICINES", questionText: "Are TTO/TTA medications prescribed?", questionType: "YES_NO_UNKNOWN", requiredRole: "DOCTOR", order: 2 },
  { domain: "MEDICINES", questionText: "Has pharmacy screened the discharge prescription?", questionType: "YES_NO_UNKNOWN", requiredRole: "PHARMACIST", order: 3 },
  { domain: "MEDICINES", questionText: "Does the patient need counselling on new or high-risk medicines?", questionType: "YES_NO_UNKNOWN", requiredRole: "PHARMACIST", order: 4 },
  { domain: "MEDICINES", questionText: "Are high-risk medicine instructions clearly documented?", questionType: "YES_NO_UNKNOWN", requiredRole: "DOCTOR", order: 5 },
  { domain: "FAMILY_COMMUNICATION", questionText: "Has the patient been informed?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 1 },
  { domain: "FAMILY_COMMUNICATION", questionText: "Has family or next of kin been updated?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 2 },
  { domain: "FAMILY_COMMUNICATION", questionText: "Are there concerns or objections?", questionType: "YES_NO_UNKNOWN", requiredRole: "NURSE", order: 3 },
  { domain: "FAMILY_COMMUNICATION", questionText: "Is capacity documentation required?", questionType: "YES_NO_UNKNOWN", requiredRole: "DOCTOR", order: 4 },
  { domain: "FAMILY_COMMUNICATION", questionText: "Is best-interests documentation required?", questionType: "YES_NO_UNKNOWN", requiredRole: "DOCTOR", order: 5 },
];

const PATIENTS = [
  { firstName: "Jane", lastName: "Demo", nhs: "9990001001", hospital: "H001", scenario: "tto", bed: "01" },
  { firstName: "Robert", lastName: "Sample", nhs: "9990001002", hospital: "H002", scenario: "transport", bed: "02" },
  { firstName: "Margaret", lastName: "Fictional", nhs: "9990001003", hospital: "H003", scenario: "ot", bed: "03" },
  { firstName: "David", lastName: "Example", nhs: "9990001004", hospital: "H004", scenario: "care", bed: "04" },
  { firstName: "Susan", lastName: "Placeholder", nhs: "9990001005", hospital: "H005", scenario: "consultant", bed: "05" },
  { firstName: "Michael", lastName: "Testpatient", nhs: "9990001006", hospital: "H006", scenario: "family", bed: "06" },
  { firstName: "Patricia", lastName: "Mockson", nhs: "9990001007", hospital: "H007", scenario: "not_fit", bed: "07" },
  { firstName: "William", lastName: "Simulated", nhs: "9990001008", hospital: "H008", scenario: "care_home", bed: "08" },
  { firstName: "Elizabeth", lastName: "Trial", nhs: "9990001009", hospital: "H009", scenario: "pharmacy", bed: "09" },
  { firstName: "Thomas", lastName: "Preview", nhs: "9990001010", hospital: "H010", scenario: "tomorrow", bed: "10" },
];

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  console.log("Seeding Discharge AI database...");

  for (const u of DEV_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { id: u.id, name: u.name, email: u.email, role: u.role },
    });
  }

  for (const q of QUESTIONS) {
    const existing = await prisma.dischargeQuestion.findFirst({
      where: { questionText: q.questionText, domain: q.domain },
    });
    if (!existing) {
      await prisma.dischargeQuestion.create({
        data: {
          domain: q.domain,
          questionText: q.questionText,
          questionType: q.questionType,
          requiredRole: q.requiredRole,
          isRequired: true,
          order: q.order,
          selectOptions: q.selectOptions ? q.selectOptions : undefined,
        },
      });
    }
  }

  const doctor = await prisma.user.findFirst({ where: { role: "DOCTOR" } });
  const nurse = await prisma.user.findFirst({ where: { role: "NURSE" } });

  for (const p of PATIENTS) {
    const patient = await prisma.patient.upsert({
      where: { nhsNumber: p.nhs },
      update: {},
      create: {
        nhsNumber: p.nhs,
        hospitalNumber: p.hospital,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date("1955-06-15"),
        sex: "Female",
        address: "123 Demo Street, Demo Town, DT1 2AB",
      },
    });

    const encounter = await prisma.encounter.upsert({
      where: { id: `enc-${p.hospital}` },
      update: {},
      create: {
        id: `enc-${p.hospital}`,
        patientId: patient.id,
        ward: "4A",
        bed: p.bed,
        specialty: "General Medicine",
        consultantName: "Dr Ahmed Hassan",
        admissionDate: daysAgo(5),
        expectedDischargeDate: p.scenario === "tomorrow" ? daysFromNow(1) : daysFromNow(0),
        status: "ACTIVE",
      },
    });

    await prisma.clinicalDataSnapshot.upsert({
      where: { id: `snap-${p.hospital}` },
      update: {},
      create: {
        id: `snap-${p.hospital}`,
        patientId: patient.id,
        encounterId: encounter.id,
        diagnoses: ["Community acquired pneumonia", "Type 2 diabetes"],
        problemList: ["Hypertension"],
        observations: [{ type: "BP", value: "128/78" }, { type: "HR", value: "82" }],
        news2Score: p.scenario === "not_fit" ? 5 : 2,
        currentMedications: [
          { name: "Amoxicillin", dose: "500mg TDS" },
          { name: "Metformin", dose: "500mg BD" },
        ],
        allergies: ["Penicillin — rash"],
        therapyNotes: p.scenario === "ot" ? ["Awaiting stair assessment"] : ["Mobilising with frame"],
        nursingNotes: ["Stable overnight", "Eating and drinking"],
        socialHistory: { livesAlone: p.scenario === "family", hasCarer: p.scenario === "care" },
        pendingInvestigations: p.scenario === "consultant" ? ["Pending blood cultures"] : [],
        frailtyScore: "Moderate",
      },
    });

    await prisma.sourceEvidence.upsert({
      where: { id: `ev-${p.hospital}` },
      update: {},
      create: {
        id: `ev-${p.hospital}`,
        patientId: patient.id,
        encounterId: encounter.id,
        sourceSystem: "MOCK_EPR",
        sourceType: "ClinicalDataSnapshot",
        sourceId: `snap-${p.hospital}`,
        label: "Admission diagnosis",
        excerpt: "Community acquired pneumonia — improving on antibiotics",
      },
    });

    const scenarioNotes: Record<string, string> = {
      tto: "TTOs not yet screened. Patient otherwise ready.",
      transport: "Awaiting hospital transport booking.",
      ot: "Awaiting OT stair assessment before discharge.",
      care: "Care package restart not yet confirmed by coordinator.",
      consultant: "Awaiting consultant review of pending cultures.",
      family: "Next of kin not yet updated about discharge plan.",
      not_fit: "Patient remains pyrexial. Not medically fit today.",
      care_home: "Complex discharge to care home — placement confirmed.",
      pharmacy: "High-risk warfarin counselling required before discharge.",
      tomorrow: "Likely discharge tomorrow if observations remain stable.",
    };

    if (scenarioNotes[p.scenario]) {
      await prisma.freeTextNote.upsert({
        where: { id: `note-${p.hospital}` },
        update: { text: scenarioNotes[p.scenario] },
        create: {
          id: `note-${p.hospital}`,
          patientId: patient.id,
          encounterId: encounter.id,
          authorId: nurse!.id,
          text: scenarioNotes[p.scenario],
        },
      });
    }

    const questions = await prisma.dischargeQuestion.findMany();
    const medicalFitQ = questions.find((q) => q.questionText.includes("medically fit"));
    if (medicalFitQ && doctor) {
      await prisma.dischargeAnswer.upsert({
        where: { questionId_encounterId: { questionId: medicalFitQ.id, encounterId: encounter.id } },
        update: {},
        create: {
          questionId: medicalFitQ.id,
          patientId: patient.id,
          encounterId: encounter.id,
          answeredById: doctor.id,
          value: { answer: p.scenario === "not_fit" ? "no" : p.scenario === "consultant" ? "unknown" : "yes" },
        },
      });
    }

    if (p.scenario === "tto" && doctor) {
      const ttoQ = questions.find((q) => q.questionText.includes("TTO"));
      if (ttoQ) {
        await prisma.dischargeAnswer.upsert({
          where: { questionId_encounterId: { questionId: ttoQ.id, encounterId: encounter.id } },
          update: {},
          create: {
            questionId: ttoQ.id,
            patientId: patient.id,
            encounterId: encounter.id,
            answeredById: doctor.id,
            value: { answer: "no" },
          },
        });
      }
      await prisma.blocker.upsert({
        where: { id: `blk-${p.hospital}` },
        update: {},
        create: {
          id: `blk-${p.hospital}`,
          patientId: patient.id,
          encounterId: encounter.id,
          domain: "MEDICINES",
          title: "TTO not screened",
          description: "Discharge prescription awaiting pharmacy screening",
          severity: "HIGH",
          status: "BLOCKED",
          ownerRole: "PHARMACIST",
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
