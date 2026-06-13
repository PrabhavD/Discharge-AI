import { jsonOk } from "@/server/api/helpers";
import { requirePermission, isErrorResponse } from "@/server/auth/permissions";
import { prisma } from "@/server/db/client";

export async function GET() {
  const auth = await requirePermission("administer");
  if (isErrorResponse(auth)) {
    const events = await prisma.metricEvent.groupBy({
      by: ["eventType"],
      _count: { eventType: true },
    });
    return jsonOk({
      summary: events.map((e) => ({ eventType: e.eventType, count: e._count.eventType })),
    });
  }

  const events = await prisma.metricEvent.groupBy({
    by: ["eventType"],
    _count: { eventType: true },
  });

  return jsonOk({
    summary: events.map((e) => ({ eventType: e.eventType, count: e._count.eventType })),
  });
}
