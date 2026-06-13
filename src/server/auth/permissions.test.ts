import { describe, it, expect } from "vitest";
import { hasPermission, canAnswerQuestion } from "@/server/auth/permissions";

describe("permissions", () => {
  it("allows doctors to approve discharge", () => {
    expect(hasPermission("DOCTOR", "approve_discharge")).toBe(true);
  });

  it("denies nurses from approving discharge", () => {
    expect(hasPermission("NURSE", "approve_discharge")).toBe(false);
  });

  it("allows nurses to answer nursing questions only", () => {
    expect(canAnswerQuestion("NURSE", "NURSE")).toBe(true);
    expect(canAnswerQuestion("NURSE", "DOCTOR")).toBe(false);
  });

  it("allows consultants to answer medical questions", () => {
    expect(canAnswerQuestion("CONSULTANT", "DOCTOR")).toBe(true);
  });
});
