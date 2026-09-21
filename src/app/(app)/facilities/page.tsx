import { redirect } from "next/navigation";
import { requireModuleAccess } from "@/server/services/authz";
import { listAssets } from "@/server/services/facilities";
import { PageContainer } from "@/components/shell/PageContainer";

export default async function FacilitiesPage() {
  await requireModuleAccess("facilities", "read");

  const assets = await listAssets();
  // Default focus on the first asset (LSS-204 in seeded env). If there's
  // nothing seeded, that's an operator error, not something we hide.
  const first = assets[0];
  if (!first) {
    return (
      <PageContainer eyebrow="Facilities" title="No assets registered">
        <p className="text-sm text-slate-600">Run <code>pnpm db:seed</code> to load synthetic assets.</p>
      </PageContainer>
    );
  }
  redirect(`/facilities/${first.code}`);
}
