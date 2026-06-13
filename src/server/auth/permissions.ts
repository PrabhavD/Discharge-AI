import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./session";

export type Permission =
  | "view_dashboard"
  | "view_workspace"
  | "answer_medical_questions"
  | "answer_nursing_questions"
  | "update_medicines"
  | "update_transport_care"
  | "generate_ai"
  | "edit_draft_summary"
  | "approve_discharge"
  | "administer";

const PERMISSIONS: Record<Permission, UserRole[]> = {
  view_dashboard: ["DOCTOR", "NURSE", "CONSULTANT", "PHARMACIST", "PHYSIOTHERAPIST", "OCCUPATIONAL_THERAPIST", "DISCHARGE_COORDINATOR", "BED_MANAGER", "ADMIN", "READ_ONLY"],
  view_workspace: ["DOCTOR", "NURSE", "CONSULTANT", "PHARMACIST", "PHYSIOTHERAPIST", "OCCUPATIONAL_THERAPIST", "DISCHARGE_COORDINATOR", "BED_MANAGER", "ADMIN", "READ_ONLY"],
  answer_medical_questions: ["DOCTOR", "CONSULTANT", "ADMIN"],
  answer_nursing_questions: ["NURSE", "ADMIN"],
  update_medicines: ["DOCTOR", "CONSULTANT", "PHARMACIST", "ADMIN"],
  update_transport_care: ["NURSE", "DISCHARGE_COORDINATOR", "ADMIN"],
  generate_ai: ["DOCTOR", "NURSE", "CONSULTANT", "PHARMACIST", "DISCHARGE_COORDINATOR", "ADMIN"],
  edit_draft_summary: ["DOCTOR", "CONSULTANT", "ADMIN"],
  approve_discharge: ["DOCTOR", "CONSULTANT", "ADMIN"],
  administer: ["ADMIN"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

export function canAnswerQuestion(role: UserRole, requiredRole: UserRole): boolean {
  if (role === "ADMIN") return true;
  if (requiredRole === "DOCTOR" || requiredRole === "CONSULTANT") {
    return role === "DOCTOR" || role === "CONSULTANT";
  }
  if (requiredRole === "NURSE") {
    return role === "NURSE";
  }
  return role === requiredRole;
}

export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!hasPermission(result.role, permission)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
