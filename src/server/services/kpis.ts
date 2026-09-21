import { db } from "@/lib/db";
import { openAlertCount } from "./alerts";

/**
 * Computes the four Home Portal KPIs live from Postgres + the in-memory
 * alert ring. Cheap enough (small aggregate queries) to run per request;
 * cache with `queryClient.staleTime` on the client.
 */
export async function getHomeKpis() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [assets, activeWorkflows, knowledgeToday] = await Promise.all([
    db.asset.groupBy({ by: ["healthStatus"], _count: { _all: true } }),
    db.incident.count({
      where: { status: { in: ["open", "triaging", "responding"] } },
    }),
    db.aiInteraction.count({
      where: { kind: "answer", createdAt: { gte: startOfDay } },
    }),
  ]);

  const totalAssets = assets.reduce((sum, a) => sum + a._count._all, 0);
  const criticalAssets =
    assets.find((a) => a.healthStatus === "critical")?._count._all ?? 0;
  const healthyAssets = totalAssets - criticalAssets;

  return {
    systemsHealthy: { value: healthyAssets, of: totalAssets },
    openAlerts: openAlertCount(),
    activeWorkflows,
    knowledgeQueriesToday: knowledgeToday,
  };
}

export type HomeKpis = Awaited<ReturnType<typeof getHomeKpis>>;
