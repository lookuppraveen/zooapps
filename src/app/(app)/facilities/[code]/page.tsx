import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/server/services/authz";
import { getAssetByCode } from "@/server/services/facilities";
import { PageContainer } from "@/components/shell/PageContainer";
import { ComponentReuseChip } from "@/components/ui/ComponentReuseChip";
import { AssetFocusCard } from "@/components/facilities/AssetFocusCard";
import { Watchlist } from "@/components/facilities/Watchlist";

type Params = { code: string };

export default async function FacilityAssetPage({
  params,
}: {
  params: Promise<Params>;
}) {
  await requireModuleAccess("facilities", "read");
  const { code } = await params;
  const asset = await getAssetByCode(code);
  if (!asset) notFound();

  return (
    <PageContainer
      eyebrow="Facilities & Maintenance Intelligence"
      title={asset.name}
      description={`Live sensor telemetry compared to species-appropriate thresholds and historical baselines.`}
      actions={<ComponentReuseChip label="Dashboard capability + sensor ingestion" />}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AssetFocusCard code={asset.code} />
        </div>
        <Watchlist activeCode={asset.code} />
      </div>
    </PageContainer>
  );
}
