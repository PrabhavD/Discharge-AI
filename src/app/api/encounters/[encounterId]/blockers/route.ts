import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { listBlockers, createBlocker, updateBlocker } from "@/server/modules/blockers/blocker.service";
import { BlockerSeverity, DischargeDomain, UserRole } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;
  const { encounterId } = await params;
  const blockers = await listBlockers(encounterId);
  return jsonOk({ blockers });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;

  const { encounterId } = await params;
  const body = await parseJsonBody<{
    domain: DischargeDomain;
    title: string;
    description?: string;
    severity?: BlockerSeverity;
    ownerRole: UserRole;
    escalationRoute?: string;
  }>(request);
  if (body instanceof Response) return body;

  const blocker = await createBlocker({ ...body, encounterId, actorId: auth.id });
  return jsonOk({ blocker });
}
