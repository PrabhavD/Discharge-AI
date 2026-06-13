import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { upsertAnswer } from "@/server/modules/questionnaire/questionnaire.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;

  const { encounterId } = await params;
  const body = await parseJsonBody<{ questionId: string; value: unknown; notes?: string }>(request);
  if (body instanceof Response) return body;

  try {
    const answer = await upsertAnswer({
      encounterId,
      questionId: body.questionId,
      value: body.value,
      notes: body.notes,
      userId: auth.id,
      userRole: auth.role,
    });
    return jsonOk({ answer });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to save answer", 403);
  }
}
