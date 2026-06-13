import { beforeEach, describe, expect, it } from "vitest";
import {
  JANE_DEMO_BLOCKER_ID,
  JANE_DEMO_ENCOUNTER_ID,
  resetJaneDemoEncounter,
  testPrisma,
} from "../helpers/reset-workflow-patient";
import { createBlocker, updateBlocker } from "@/server/modules/blockers/blocker.service";
import { createTask, updateTask } from "@/server/modules/tasks/task.service";
import { getApprovalChecklist } from "@/server/policy/discharge-policy";

const DOCTOR_ID = "user-doctor-1";

async function seedPlanForJaneDemo() {
  const encounter = await testPrisma.encounter.findUniqueOrThrow({
    where: { id: JANE_DEMO_ENCOUNTER_ID },
  });
  return testPrisma.dischargePlan.create({
    data: {
      patientId: encounter.patientId,
      encounterId: JANE_DEMO_ENCOUNTER_ID,
      generatedBy: "AI",
      overallStatus: "RED",
      summary: "Test plan",
      readinessRationale: "Test",
      missingInformation: [],
      safetyConcerns: [],
      uncertainty: [],
      confidence: 0.8,
      humanApprovalRequired: true,
      finalDecisionRequired: true,
      approvalStatus: "DRAFT",
      domainStatuses: {
        create: [
          { domain: "MEDICAL_READINESS", status: "GREEN", ownerRole: "DOCTOR", summary: "Stable", confidence: 0.9 },
          { domain: "MEDICINES", status: "RED", ownerRole: "PHARMACIST", summary: "TTO blocked", confidence: 0.8 },
          { domain: "THERAPY_AND_MOBILITY", status: "GREEN", ownerRole: "PHYSIOTHERAPIST", summary: "Cleared", confidence: 0.9 },
          { domain: "HOME_AND_CARE", status: "GREEN", ownerRole: "DISCHARGE_COORDINATOR", summary: "Home ready", confidence: 0.9 },
          { domain: "TRANSPORT", status: "GREEN", ownerRole: "NURSE", summary: "Family collects", confidence: 0.9 },
          { domain: "FAMILY_COMMUNICATION", status: "GREEN", ownerRole: "NURSE", summary: "Informed", confidence: 0.9 },
          { domain: "DOCUMENTATION", status: "GREEN", ownerRole: "DOCTOR", summary: "Drafted", confidence: 0.9 },
          { domain: "FOLLOW_UP", status: "GREEN", ownerRole: "DOCTOR", summary: "Booked", confidence: 0.9 },
        ],
      },
    },
    include: { domainStatuses: true },
  });
}

describe("task and blocker resolve workflow", () => {
  beforeEach(async () => {
    await resetJaneDemoEncounter();
  });

  it("marks a task as DONE with completedAt and audit event", async () => {
    const task = await createTask({
      encounterId: JANE_DEMO_ENCOUNTER_ID,
      domain: "MEDICINES",
      title: "Complete TTO screening",
      ownerRole: "PHARMACIST",
      actorId: DOCTOR_ID,
    });

    const updated = await updateTask(task.id, { status: "DONE" }, DOCTOR_ID);

    expect(updated.status).toBe("DONE");
    expect(updated.completedAt).not.toBeNull();

    const audit = await testPrisma.auditEvent.findFirst({
      where: { entityId: task.id, eventType: "TASK_UPDATED" },
    });
    expect(audit).not.toBeNull();
  });

  it("resolves seeded blocker blk-H001 with resolvedAt and BLOCKER_RESOLVED audit", async () => {
    const before = await getApprovalChecklist(JANE_DEMO_ENCOUNTER_ID);
    expect(before.activeBlockerCount).toBeGreaterThan(0);

    const blocker = await updateBlocker(
      JANE_DEMO_BLOCKER_ID,
      { status: "DONE", notes: "Pharmacy screening complete" },
      DOCTOR_ID
    );

    expect(blocker.status).toBe("DONE");
    expect(blocker.resolvedAt).not.toBeNull();

    const audit = await testPrisma.auditEvent.findFirst({
      where: { entityId: JANE_DEMO_BLOCKER_ID, eventType: "BLOCKER_RESOLVED" },
    });
    expect(audit).not.toBeNull();

    const after = await getApprovalChecklist(JANE_DEMO_ENCOUNTER_ID);
    expect(after.activeBlockerCount).toBe(0);
  });

  it("reduces activeBlockerCount as blockers are resolved", async () => {
    await createTask({
      encounterId: JANE_DEMO_ENCOUNTER_ID,
      domain: "MEDICINES",
      title: "Secondary task",
      ownerRole: "PHARMACIST",
      actorId: DOCTOR_ID,
    });

    const initial = await getApprovalChecklist(JANE_DEMO_ENCOUNTER_ID);
    expect(initial.activeBlockerCount).toBe(1);

    await updateBlocker(JANE_DEMO_BLOCKER_ID, { status: "DONE" }, DOCTOR_ID);

    const final = await getApprovalChecklist(JANE_DEMO_ENCOUNTER_ID);
    expect(final.activeBlockerCount).toBe(0);
  });
});

describe("doctor unblocking workflow recomputes plan status", () => {
  beforeEach(async () => {
    await resetJaneDemoEncounter();
  });

  it("recomputes overallStatus from RED to GREEN when the only blocker is resolved", async () => {
    const plan = await seedPlanForJaneDemo();
    expect(plan.overallStatus).toBe("RED");
    expect(plan.domainStatuses.find((d) => d.domain === "MEDICINES")?.status).toBe("RED");

    await updateBlocker(JANE_DEMO_BLOCKER_ID, { status: "DONE" }, DOCTOR_ID);

    const refreshed = await testPrisma.dischargePlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { domainStatuses: true },
    });
    expect(refreshed.overallStatus).toBe("GREEN");
    expect(refreshed.domainStatuses.find((d) => d.domain === "MEDICINES")?.status).toBe("GREEN");

    const audit = await testPrisma.auditEvent.findFirst({
      where: { encounterId: JANE_DEMO_ENCOUNTER_ID, eventType: "PLAN_STATUS_RECOMPUTED" },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
    expect((audit?.after as any)?.overallStatus).toBe("GREEN");
  });

  it("downgrades RED → AMBER when only an active task remains in the domain", async () => {
    const plan = await seedPlanForJaneDemo();
    await createTask({
      encounterId: JANE_DEMO_ENCOUNTER_ID,
      domain: "MEDICINES",
      title: "Counsel patient on medication",
      ownerRole: "PHARMACIST",
      actorId: DOCTOR_ID,
    });

    await updateBlocker(JANE_DEMO_BLOCKER_ID, { status: "DONE" }, DOCTOR_ID);

    const refreshed = await testPrisma.dischargePlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { domainStatuses: true },
    });
    expect(refreshed.domainStatuses.find((d) => d.domain === "MEDICINES")?.status).toBe("AMBER");
    expect(refreshed.overallStatus).toBe("AMBER");
  });

  it("transitions to GREEN once all tasks and blockers are cleared", async () => {
    const plan = await seedPlanForJaneDemo();
    const task = await createTask({
      encounterId: JANE_DEMO_ENCOUNTER_ID,
      domain: "MEDICINES",
      title: "Pharmacy counselling",
      ownerRole: "PHARMACIST",
      actorId: DOCTOR_ID,
    });

    await updateBlocker(JANE_DEMO_BLOCKER_ID, { status: "DONE" }, DOCTOR_ID);
    let refreshed = await testPrisma.dischargePlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { domainStatuses: true },
    });
    expect(refreshed.overallStatus).toBe("AMBER");

    await updateTask(task.id, { status: "DONE" }, DOCTOR_ID);
    refreshed = await testPrisma.dischargePlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { domainStatuses: true },
    });
    expect(refreshed.overallStatus).toBe("GREEN");
    expect(refreshed.domainStatuses.find((d) => d.domain === "MEDICINES")?.status).toBe("GREEN");
  });

  it("keeps overallStatus RED if a different domain has a CRITICAL blocker", async () => {
    const plan = await seedPlanForJaneDemo();
    await createBlocker({
      encounterId: JANE_DEMO_ENCOUNTER_ID,
      domain: "TRANSPORT",
      title: "Ambulance unavailable",
      severity: "CRITICAL",
      ownerRole: "BED_MANAGER",
      actorId: DOCTOR_ID,
    });

    await updateBlocker(JANE_DEMO_BLOCKER_ID, { status: "DONE" }, DOCTOR_ID);

    const refreshed = await testPrisma.dischargePlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { domainStatuses: true },
    });
    expect(refreshed.domainStatuses.find((d) => d.domain === "MEDICINES")?.status).toBe("GREEN");
    expect(refreshed.domainStatuses.find((d) => d.domain === "TRANSPORT")?.status).toBe("RED");
    expect(refreshed.overallStatus).toBe("RED");
  });

  it("is a no-op when no plan exists yet (does not throw)", async () => {
    // Reset clears any plan — confirm resolving still works
    await expect(
      updateBlocker(JANE_DEMO_BLOCKER_ID, { status: "DONE" }, DOCTOR_ID)
    ).resolves.toBeDefined();

    const checklist = await getApprovalChecklist(JANE_DEMO_ENCOUNTER_ID);
    expect(checklist.activeBlockerCount).toBe(0);
  });
});
