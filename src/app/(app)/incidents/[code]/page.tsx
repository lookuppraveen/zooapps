import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/server/services/authz";
import { getIncidentByCode } from "@/server/services/incidents";
import { PageContainer } from "@/components/shell/PageContainer";
import { ComponentReuseChip } from "@/components/ui/ComponentReuseChip";
import { IncidentBanner } from "@/components/incident/IncidentBanner";
import { Kanban } from "@/components/incident/Kanban";
import { PlanTimeline } from "@/components/incident/PlanTimeline";
import { POCard } from "@/components/procurement/POCard";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireModuleAccess("incidents", "read");
  const { code } = await params;
  const incident = await getIncidentByCode(code);
  if (!incident) notFound();

  return (
    <PageContainer
      eyebrow="Incident & Workflow Assistant"
      title={`${incident.code} · ${incident.asset.name}`}
      description={`Priority ${incident.priority} · Asset ${incident.asset.code} · Status ${incident.status}`}
      actions={<ComponentReuseChip label="Agent Builder + ProcureChain" />}
    >
      <div className="space-y-4">
        <IncidentBanner
          code={incident.code}
          assetCode={incident.asset.code}
          priority={incident.priority}
          summary={incident.summary}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Kanban
              incidentCode={incident.code}
              tasks={incident.tasks.map((t) => ({
                id: t.id,
                title: t.title,
                column: t.column,
                order: t.order,
                aiGenerated: t.aiGenerated,
                completedAt: t.completedAt,
              }))}
            />
          </div>
          <PlanTimeline steps={incident.planSteps} />
        </div>

        <POCard
          incidentCode={incident.code}
          purchaseOrders={incident.purchaseOrders.map((po) => ({
            id: po.id,
            externalId: po.externalId,
            vendor: po.vendor,
            itemDescription: po.itemDescription,
            qty: po.qty,
            unitCostCents: po.unitCostCents,
            status: po.status,
            createdAt: po.createdAt,
            approvals: po.approvals,
          }))}
        />
      </div>
    </PageContainer>
  );
}
