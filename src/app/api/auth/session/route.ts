import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/server/api/helpers";
import { setSessionUser, clearSession, getSessionUser } from "@/server/auth/session";
import { DEV_USERS } from "@/server/auth/dev-users";

export async function GET() {
  const user = await getSessionUser();
  return jsonOk({ users: DEV_USERS, user });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = body.userId as string;
  if (!userId) return jsonError("userId required", 400);
  const user = await setSessionUser(userId);
  if (!user) return jsonError("User not found", 404);
  return jsonOk({ user });
}

export async function DELETE() {
  await clearSession();
  return jsonOk({ success: true });
}
