import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { approveDischargePlan } from "@/server/modules/documents/document.service";
import { validatePlanApproval } from "@/server/policy/discharge-policy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dischargePlanId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;
  const { dischargePlanId } = await params;
  const validation = await validatePlanApproval(dischargePlanId);
  return jsonOk(validation);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dischargePlanId: string }> }
) {
  const auth = await requirePermission("approve_discharge");
  if (isErrorResponse(auth)) return auth;

  const { dischargePlanId } = await params;
  const body = await parseJsonBody<{ comments?: string; overrideReason?: string }>(request);
  const comments = body instanceof Response ? undefined : body.comments;
  const overrideReason = body instanceof Response ? undefined : body.overrideReason;

  try {
    const plan = await approveDischargePlan(dischargePlanId, auth.id, comments, overrideReason);
    return jsonOk({ plan });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Approval failed", 409);
  }
}
