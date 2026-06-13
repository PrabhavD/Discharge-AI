import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import {
  generateAndPersistDischargePlan,
  acceptAiPlan,
  rejectAiPlan,
  getLatestPlan,
} from "@/server/modules/discharge-plan/discharge-plan.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;
  const { encounterId } = await params;
  const plan = await getLatestPlan(encounterId);
  return jsonOk({ plan });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("generate_ai");
  if (isErrorResponse(auth)) return auth;

  const { encounterId } = await params;
  const body = await parseJsonBody<{ action?: string; planId?: string; reason?: string }>(request);
  if (body instanceof Response) {
    try {
      const plan = await generateAndPersistDischargePlan(encounterId, auth.id, auth.role);
      return jsonOk({ plan, aiGenerated: true, humanApprovalRequired: true });
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "AI generation failed", 400);
    }
  }

  if (body.action === "accept" && body.planId) {
    await acceptAiPlan(body.planId, auth.id);
    return jsonOk({ success: true });
  }
  if (body.action === "reject" && body.planId) {
    await rejectAiPlan(body.planId, auth.id, body.reason);
    return jsonOk({ success: true });
  }

  try {
    const plan = await generateAndPersistDischargePlan(encounterId, auth.id, auth.role);
    return jsonOk({ plan, aiGenerated: true, humanApprovalRequired: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "AI generation failed", 400);
  }
}
