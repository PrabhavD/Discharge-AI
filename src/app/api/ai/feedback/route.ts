import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requireAuth, isErrorResponse } from "@/server/auth/permissions";
import { recordAiFeedback, createHazardReport } from "@/server/modules/documents/document.service";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const body = await parseJsonBody<{
    encounterId: string;
    planId?: string;
    outputType: "DISCHARGE_PLAN" | "READINESS_SUMMARY" | "DRAFT_DOCUMENT";
    outcome: "ACCEPTED" | "EDITED" | "REJECTED";
    reason?: string;
  }>(request);
  if (body instanceof Response) return body;

  const feedback = await recordAiFeedback({ ...body, userId: auth.id });
  return jsonOk({ feedback });
}
