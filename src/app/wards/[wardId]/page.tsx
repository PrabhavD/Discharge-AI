import { WardDashboard } from "@/components/dashboard/ward-dashboard";
import { MetricsPanel } from "@/components/dashboard/metrics-panel";

export default async function WardPage({ params }: { params: Promise<{ wardId: string }> }) {
  const { wardId } = await params;
  return (
    <div className="space-y-6">
      <WardDashboard wardId={wardId} />
      <MetricsPanel wardId={wardId} />
    </div>
  );
}
