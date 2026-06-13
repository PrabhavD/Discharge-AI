import { describe, it, expect } from "vitest";
import { DischargePlanJsonSchema } from "@/server/ai/schemas/discharge-plan.schema";
import { validateAiOutput } from "@/server/policy/discharge-policy";

describe("discharge plan schema", () => {
  const validPlan = {
    overallStatus: "AMBER",
    summary: "Patient may be dischargeable if blockers resolved.",
    readinessRationale: [{ statement: "OT pending", type: "fact" as const }],
    domains: [{
      domain: "MEDICAL_READINESS",
      status: "AMBER",
      ownerRole: "DOCTOR",
      summary: "Needs confirmation",
      confidence: 0.7,
    }],
    tasks: [],
    blockers: [],
    missingInformation: [],
    safetyConcerns: [],
    draftDocuments: [],
    confidence: 0.68,
    uncertainty: ["Medical fitness not confirmed"],
    finalDecisionRequired: true as const,
    humanApprovalRequired: true as const,
  };

  it("accepts valid AI JSON", () => {
    expect(() => DischargePlanJsonSchema.parse(validPlan)).not.toThrow();
  });

  it("rejects missing humanApprovalRequired", () => {
    expect(() =>
      DischargePlanJsonSchema.parse({ ...validPlan, humanApprovalRequired: false })
    ).toThrow();
  });

  it("validateAiOutput rejects autonomous approval flags", () => {
    expect(() => validateAiOutput({ humanApprovalRequired: false })).toThrow();
    expect(() => validateAiOutput({ finalDecisionRequired: false })).toThrow();
  });
});
