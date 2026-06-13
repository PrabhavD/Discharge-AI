import { jsonOk, jsonError } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { generateReadinessSummary } from "@/server/modules/discharge-plan/discharge-plan.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("generate_ai");
  if (isErrorResponse(auth)) return auth;

  const { encounterId } = await params;
  try {
    const summary = await generateReadinessSummary(encounterId, auth.id, auth.role);
    return jsonOk({ summary, aiGenerated: true, humanApprovalRequired: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "AI generation failed", 400);
  }
}
