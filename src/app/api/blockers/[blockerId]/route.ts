import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { updateBlocker } from "@/server/modules/blockers/blocker.service";
import { TaskStatus } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ blockerId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;

  const { blockerId } = await params;
  const body = await parseJsonBody<{
    status?: TaskStatus;
    title?: string;
    description?: string;
    notes?: string;
    escalationRoute?: string;
  }>(request);
  if (body instanceof Response) return body;

  try {
    const blocker = await updateBlocker(blockerId, body, auth.id);
    return jsonOk({ blocker });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Update failed", 400);
  }
}
