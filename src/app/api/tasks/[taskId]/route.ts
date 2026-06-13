import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { updateTask } from "@/server/modules/tasks/task.service";
import { TaskPriority, TaskStatus } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;

  const { taskId } = await params;
  const body = await parseJsonBody<{
    status?: TaskStatus;
    title?: string;
    description?: string;
    priority?: TaskPriority;
  }>(request);
  if (body instanceof Response) return body;

  try {
    const task = await updateTask(taskId, body, auth.id);
    return jsonOk({ task });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Update failed", 400);
  }
}
