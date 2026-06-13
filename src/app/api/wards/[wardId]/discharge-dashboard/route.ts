import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { getWardDashboard } from "@/server/modules/dashboard/dashboard.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wardId: string }> }
) {
  const auth = await requirePermission("view_dashboard");
  if (isErrorResponse(auth)) return auth;

  const { wardId } = await params;
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const blocker = request.nextUrl.searchParams.get("blocker") ?? undefined;
  const owner = request.nextUrl.searchParams.get("owner") ?? undefined;

  const dashboard = await getWardDashboard(wardId, { status, blocker, owner });
  return jsonOk(dashboard);
}
