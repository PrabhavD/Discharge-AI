import { prisma } from "@/server/db/client";

export interface ClinicalSnapshotDto {
  diagnoses: string[];
  problemList: string[];
  observations: unknown[];
  news2Score: number | null;
  bloodResults: unknown[];
  imagingReports: unknown[];
  currentMedications: unknown[];
  allergies: string[];
  therapyNotes: string[];
  nursingNotes: string[];
  socialHistory: Record<string, unknown>;
  safeguardingFlags: string[];
  frailtyScore: string | null;
  capacityConcerns: string[];
  pendingInvestigations: string[];
  existingReferrals: string[];
}

export interface EprAdapter {
  getClinicalSnapshot(patientId: string, encounterId: string): Promise<ClinicalSnapshotDto>;
  refreshSnapshot(encounterId: string): Promise<{ id: string; capturedAt: Date }>;
}

export class MockEprAdapter implements EprAdapter {
  async getClinicalSnapshot(patientId: string, encounterId: string): Promise<ClinicalSnapshotDto> {
    const snapshot = await prisma.clinicalDataSnapshot.findFirst({
      where: { patientId, encounterId },
      orderBy: { capturedAt: "desc" },
    });
    if (!snapshot) throw new Error("No clinical snapshot available");
    return {
      diagnoses: snapshot.diagnoses as string[],
      problemList: snapshot.problemList as string[],
      observations: snapshot.observations as unknown[],
      news2Score: snapshot.news2Score,
      bloodResults: snapshot.bloodResults as unknown[],
      imagingReports: snapshot.imagingReports as unknown[],
      currentMedications: snapshot.currentMedications as unknown[],
      allergies: snapshot.allergies as string[],
      therapyNotes: snapshot.therapyNotes as string[],
      nursingNotes: snapshot.nursingNotes as string[],
      socialHistory: snapshot.socialHistory as Record<string, unknown>,
      safeguardingFlags: snapshot.safeguardingFlags as string[],
      frailtyScore: snapshot.frailtyScore,
      capacityConcerns: snapshot.capacityConcerns as string[],
      pendingInvestigations: snapshot.pendingInvestigations as string[],
      existingReferrals: snapshot.existingReferrals as string[],
    };
  }

  async refreshSnapshot(encounterId: string) {
    const encounter = await prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new Error("Encounter not found");

    const latest = await prisma.clinicalDataSnapshot.findFirst({
      where: { encounterId },
      orderBy: { capturedAt: "desc" },
    });
    if (!latest) throw new Error("No snapshot to refresh");

    const refreshed = await prisma.clinicalDataSnapshot.create({
      data: {
        patientId: encounter.patientId,
        encounterId,
        sourceSystem: "MOCK_EPR",
        capturedAt: new Date(),
        diagnoses: latest.diagnoses ?? [],
        problemList: latest.problemList ?? [],
        observations: latest.observations ?? [],
        news2Score: latest.news2Score,
        bloodResults: latest.bloodResults ?? [],
        imagingReports: latest.imagingReports ?? [],
        currentMedications: latest.currentMedications ?? [],
        allergies: latest.allergies ?? [],
        therapyNotes: latest.therapyNotes ?? [],
        nursingNotes: latest.nursingNotes ?? [],
        socialHistory: latest.socialHistory ?? {},
        safeguardingFlags: latest.safeguardingFlags ?? [],
        frailtyScore: latest.frailtyScore,
        capacityConcerns: latest.capacityConcerns ?? [],
        pendingInvestigations: latest.pendingInvestigations ?? [],
        existingReferrals: latest.existingReferrals ?? [],
        rawPayload: latest.rawPayload ?? {},
      },
    });

    await prisma.integrationEvent.create({
      data: {
        sourceSystem: "MOCK_EPR",
        eventType: "SNAPSHOT_REFRESH",
        status: "SUCCESS",
        payload: { encounterId, snapshotId: refreshed.id },
        processedAt: new Date(),
      },
    });

    return { id: refreshed.id, capturedAt: refreshed.capturedAt };
  }
}

export class FhirAdapterStub implements EprAdapter {
  async getClinicalSnapshot(): Promise<ClinicalSnapshotDto> {
    throw new Error("FHIR adapter not implemented — use MOCK_EPR for MVP");
  }
  async refreshSnapshot(): Promise<{ id: string; capturedAt: Date }> {
    throw new Error("FHIR adapter not implemented — use MOCK_EPR for MVP");
  }
}

export function getEprAdapter(): EprAdapter {
  return new MockEprAdapter();
}
