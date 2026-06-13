import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/server/auth/permissions";

export async function withAuth<T>(
  handler: (user: NonNullable<Awaited<ReturnType<typeof requireAuth>> extends infer U ? U extends Response ? never : U : never>) => Promise<T>
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;
  return handler(user as Extract<typeof user, { id: string }>);
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseJsonBody<T>(request: Request): Promise<T | NextResponse> {
  try {
    return (await request.json()) as T;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
}
