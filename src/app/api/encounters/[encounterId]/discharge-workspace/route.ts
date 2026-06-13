import { jsonOk, jsonError } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { prisma } from "@/server/db/client";
import { loadEncounterContext } from "@/server/modules/encounters/encounter.service";
import { createAuditEvent } from "@/server/modules/audit/audit.service";
import { getStaleBlockers } from "@/server/modules/dashboard/dashboard.service";
import { getApprovalChecklist } from "@/server/policy/discharge-policy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;

  const { encounterId } = await params;

  try {
    const workspace = await loadEncounterContext(encounterId);
    const checklist = await getApprovalChecklist(encounterId);
    const staleBlockers = getStaleBlockers(workspace.blockers);

    await createAuditEvent({
      actorId: auth.id,
      patientId: workspace.patientId,
      encounterId,
      eventType: "WORKSPACE_VIEWED",
      entityType: "Encounter",
      entityId: encounterId,
    });

    return jsonOk({ workspace, checklist, staleBlockers });
  } catch {
    return jsonError("Encounter not found", 404);
  }
}
