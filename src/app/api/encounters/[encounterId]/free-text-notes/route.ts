import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { createFreeTextNote, listFreeTextNotes } from "@/server/modules/questionnaire/questionnaire.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;
  const { encounterId } = await params;
  const notes = await listFreeTextNotes(encounterId);
  return jsonOk({ notes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;

  const { encounterId } = await params;
  const body = await parseJsonBody<{ text: string }>(request);
  if (body instanceof Response) return body;
  if (!body.text?.trim()) return jsonError("Text required", 400);

  try {
    const note = await createFreeTextNote({ encounterId, text: body.text.trim(), userId: auth.id });
    return jsonOk({ note });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to create note", 400);
  }
}
