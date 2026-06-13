import { jsonOk } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { listAuditEvents } from "@/server/modules/audit/audit.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;
  const { encounterId } = await params;
  const events = await listAuditEvents(encounterId);
  return jsonOk({ events });
}
