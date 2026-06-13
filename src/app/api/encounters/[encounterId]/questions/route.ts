import { jsonOk } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { listQuestions } from "@/server/modules/questionnaire/questionnaire.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;
  const { encounterId } = await params;
  const questions = await listQuestions(encounterId);
  return jsonOk({ questions });
}
