import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { listTasks, createTask, updateTask } from "@/server/modules/tasks/task.service";
import { DischargeDomain, TaskPriority, UserRole } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;
  const { encounterId } = await params;
  const tasks = await listTasks(encounterId);
  return jsonOk({ tasks });
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
    ownerRole: UserRole;
    priority?: TaskPriority;
  }>(request);
  if (body instanceof Response) return body;

  const task = await createTask({ ...body, encounterId, actorId: auth.id });
  return jsonOk({ task });
}
