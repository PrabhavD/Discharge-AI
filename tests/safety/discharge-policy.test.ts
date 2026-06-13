import { describe, it, expect } from "vitest";
import { computeOverallStatus } from "@/server/modules/dashboard/dashboard.service";
import { assertApprovalStatusTransition } from "@/server/policy/discharge-policy";

describe("discharge policy", () => {
  it("computes overall status with RED taking precedence", () => {
    expect(computeOverallStatus(["GREEN", "RED", "AMBER"])).toBe("RED");
    expect(computeOverallStatus(["GREEN", "AMBER"])).toBe("AMBER");
    expect(computeOverallStatus(["GREEN", "BLUE"])).toBe("GREEN");
  });

  it("blocks invalid approval transitions", () => {
    expect(() => assertApprovalStatusTransition("APPROVED", "DRAFT")).toThrow();
    expect(() => assertApprovalStatusTransition("PENDING_REVIEW", "APPROVED")).not.toThrow();
  });
});
