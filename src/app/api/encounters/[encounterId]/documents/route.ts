import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import {
  listDocuments,
  updateDocument,
  submitDocumentForReview,
  approveDocument,
  generateDraftDocument,
} from "@/server/modules/documents/document.service";
import { DocumentType } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("view_workspace");
  if (isErrorResponse(auth)) return auth;
  const { encounterId } = await params;
  const documents = await listDocuments(encounterId);
  return jsonOk({ documents });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const auth = await requirePermission("generate_ai");
  if (isErrorResponse(auth)) return auth;

  const { encounterId } = await params;
  const body = await parseJsonBody<{ type?: DocumentType }>(request);
  const type = (body instanceof Response ? "DISCHARGE_SUMMARY" : body.type) ?? "DISCHARGE_SUMMARY";

  try {
    const document = await generateDraftDocument(encounterId, type as DocumentType, auth.id, auth.role);
    return jsonOk({ document, aiGenerated: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Generation failed", 400);
  }
}
