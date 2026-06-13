import { NextRequest } from "next/server";
import { jsonOk, jsonError, parseJsonBody } from "@/server/api/helpers";
import { requireAuth, isErrorResponse } from "@/server/auth/permissions";
import { createHazardReport } from "@/server/modules/documents/document.service";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const body = await parseJsonBody<{
    encounterId?: string;
    patientId?: string;
    title: string;
    description: string;
    severity: string;
  }>(request);
  if (body instanceof Response) return body;

  const report = await createHazardReport({ ...body, reporterId: auth.id });
  return jsonOk({ report });
}
