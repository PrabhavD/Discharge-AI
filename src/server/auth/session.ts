import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { SESSION_COOKIE } from "@/lib/constants";
import { getDevUserById, type DevUser } from "./dev-users";
import { prisma } from "@/server/db/client";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (dbUser) {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
    };
  }

  const devUser = getDevUserById(userId);
  if (devUser) return devUser;
  return null;
}

export async function setSessionUser(userId: string): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return getSessionUser();
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function toSessionUser(user: DevUser | SessionUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
