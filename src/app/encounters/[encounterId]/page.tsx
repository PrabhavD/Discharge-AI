import { PatientWorkspace } from "@/components/workspace/patient-workspace";

export default async function EncounterPage({
  params,
}: {
  params: Promise<{ encounterId: string }>;
}) {
  const { encounterId } = await params;
  return <PatientWorkspace encounterId={encounterId} />;
}
