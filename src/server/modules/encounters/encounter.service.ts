import { prisma } from "@/server/db/client";

export async function getEncounterOrThrow(encounterId: string) {
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    include: {
      patient: true,
      clinicalSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
    },
  });
  if (!encounter) throw new Error("Encounter not found");
  return encounter;
}

export async function loadEncounterContext(encounterId: string) {
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    include: {
      patient: true,
      clinicalSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
      answers: { include: { question: true, answeredBy: { select: { id: true, name: true, role: true } } } },
      freeTextNotes: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { updatedAt: "desc" } },
      blockers: { where: { status: { not: "DONE" } }, orderBy: { updatedAt: "desc" } },
      dischargePlans: { orderBy: { createdAt: "desc" }, take: 1, include: { domainStatuses: true } },
      draftDocuments: { orderBy: { updatedAt: "desc" } },
      sourceEvidence: { orderBy: { capturedAt: "desc" } },
    },
  });
  if (!encounter) throw new Error("Encounter not found");
  return encounter;
}
