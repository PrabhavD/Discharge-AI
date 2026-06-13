import { jsonOk } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { prisma } from "@/server/db/client";

export async function GET() {
  const auth = await requirePermission("view_dashboard");
  if (isErrorResponse(auth)) return auth;

  const patients = await prisma.patient.findMany({
    include: {
      encounters: {
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
    orderBy: { lastName: "asc" },
  });

  return jsonOk({ patients });
}
