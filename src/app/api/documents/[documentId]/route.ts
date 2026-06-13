import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import {
  updateDocument,
  submitDocumentForReview,
  approveDocument,
} from "@/server/modules/documents/document.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const auth = await requirePermission("edit_draft_summary");
  if (isErrorResponse(auth)) return auth;

  const { documentId } = await params;
  const body = await parseJsonBody<{ content?: string; action?: string; comments?: string }>(request);
  if (body instanceof Response) return body;

  try {
    if (body.action === "submit_review") {
      const doc = await submitDocumentForReview(documentId, auth.id);
      return jsonOk({ document: doc });
    }
    if (body.content) {
      const doc = await updateDocument(documentId, body.content, auth.id);
      return jsonOk({ document: doc });
    }
    return jsonError("No valid action", 400);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Update failed", 400);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const auth = await requirePermission("approve_discharge");
  if (isErrorResponse(auth)) return auth;

  const { documentId } = await params;
  const body = await parseJsonBody<{ comments?: string }>(request);
  const comments = body instanceof Response ? undefined : body.comments;

  try {
    const document = await approveDocument(documentId, auth.id, comments);
    return jsonOk({ document });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Approval failed", 409);
  }
}
