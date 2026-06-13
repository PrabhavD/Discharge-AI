import { describe, it, expect } from "vitest";
import { MockAiProvider } from "@/server/ai/providers/mock";
import { AiInput } from "@/server/ai/types";

const baseInput: AiInput = {
  patient: {
    id: "p1",
    firstName: "Jane",
    lastName: "Demo",
    nhsNumber: "9990001001",
    dateOfBirth: new Date("1955-01-01"),
  },
  encounter: {
    id: "e1",
    ward: "4A",
    bed: "01",
    specialty: "General Medicine",
    consultantName: "Dr Hassan",
    admissionDate: new Date(),
    expectedDischargeDate: new Date(),
  },
  snapshot: { diagnoses: ["Pneumonia"], news2Score: 2 },
  answers: [],
  freeTextNotes: [{ id: "n1", text: "TTOs not yet screened", authorName: "Nurse" }],
  existingTasks: [],
  existingBlockers: [],
  userRole: "DOCTOR",
  outputType: "DISCHARGE_PLAN",
};

describe("MockAiProvider", () => {
  it("always requires human approval", async () => {
    const provider = new MockAiProvider();
    const plan = await provider.generateDischargePlan(baseInput);
    expect(plan.humanApprovalRequired).toBe(true);
    expect(plan.finalDecisionRequired).toBe(true);
  });

  it("detects TTO blocker from free text", async () => {
    const provider = new MockAiProvider();
    const plan = await provider.generateDischargePlan(baseInput);
    expect(plan.blockers.some((b) => b.title.toLowerCase().includes("tto"))).toBe(true);
  });

  it("does not claim autonomous fitness for discharge", async () => {
    const provider = new MockAiProvider();
    const plan = await provider.generateDischargePlan(baseInput);
    expect(plan.summary.toLowerCase()).toContain("not a clinical decision");
  });
});
