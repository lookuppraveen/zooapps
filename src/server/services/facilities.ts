import type { HealthStatus, SensorMetric } from "@prisma/client";
import { db } from "@/lib/db";
import { bus } from "@/server/realtime/sse";
import { raiseAlert } from "@/server/services/alerts";
import { appendAuditEvent } from "@/server/services/audit";

// ─── Threshold model ───────────────────────────────────────────────────

export type MetricThreshold = {
  min?: number;
  max?: number;
  nominal: number;
  unit: string;
};

export type AssetThresholds = Partial<Record<SensorMetric, MetricThreshold>>;

export function parseThresholds(raw: unknown): AssetThresholds {
  if (!raw || typeof raw !== "object") return {};
  return raw as AssetThresholds;
}

// ─── Reads ─────────────────────────────────────────────────────────────

export async function listAssets() {
  const assets = await db.asset.findMany({
    include: { habitat: { select: { name: true } } },
    orderBy: { code: "asc" },
  });
  return assets.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    category: a.category,
    habitatName: a.habitat.name,
    healthStatus: a.healthStatus,
    lastPmAt: a.lastPmAt,
    thresholds: parseThresholds(a.thresholds),
  }));
}

export async function getAssetByCode(code: string) {
  const a = await db.asset.findUnique({
    where: { code },
    include: { habitat: { select: { name: true } } },
  });
  if (!a) return null;
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    category: a.category,
    habitatName: a.habitat.name,
    healthStatus: a.healthStatus,
    lastPmAt: a.lastPmAt,
    thresholds: parseThresholds(a.thresholds),
  };
}

/**
 * Latest one reading per metric for this asset. Used to render the focus
 * card gauges — cheap enough to run on every request.
 */
export async function latestReadings(assetId: string) {
  const rows = await db.$queryRaw<
    Array<{ metric: SensorMetric; value: number; unit: string; capturedAt: Date }>
  >`
    SELECT DISTINCT ON (metric)
      metric, value, unit, "capturedAt"
    FROM sensor_readings
    WHERE "assetId" = ${assetId}::uuid
    ORDER BY metric, "capturedAt" DESC
  `;
  return rows;
}

/**
 * Time-series for a single metric over the last `hours` — powers small
 * sparklines in the focus card.
 */
export async function metricSeries(
  assetId: string,
  metric: SensorMetric,
  hours = 6,
  maxPoints = 60,
) {
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await db.sensorReading.findMany({
    where: { assetId, metric, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
    select: { value: true, capturedAt: true },
  });
  // Downsample to at most maxPoints (evenly spaced by index).
  if (rows.length <= maxPoints) return rows;
  const step = Math.floor(rows.length / maxPoints);
  const out = [];
  for (let i = 0; i < rows.length; i += step) out.push(rows[i]!);
  return out;
}

export async function maintenanceHistory(assetId: string) {
  const rows = await db.maintenanceRecord.findMany({
    where: { assetId },
    include: { technician: { select: { name: true } } },
    orderBy: { performedAt: "desc" },
    take: 10,
  });
  return rows;
}

// ─── Threshold evaluation ──────────────────────────────────────────────

export type EvalOutcome = "healthy" | "monitor" | "critical";

export function evaluateReading(
  value: number,
  t?: MetricThreshold,
): EvalOutcome {
  if (!t) return "healthy";
  const min = t.min;
  const max = t.max;
  if (min !== undefined && value < min) return "critical";
  if (max !== undefined && value > max) return "critical";
  // "monitor" band = within 10% of a boundary
  if (min !== undefined && value < min * 1.1) return "monitor";
  if (max !== undefined && value > max * 0.9) return "monitor";
  return "healthy";
}

/**
 * Persist a reading, evaluate against thresholds, publish a tick, and —
 * if the reading crosses into monitor/critical — raise an alert and
 * update the asset's health status.
 */
export async function ingestReading(input: {
  assetId: string;
  assetCode: string;
  metric: SensorMetric;
  value: number;
  unit: string;
  thresholds: AssetThresholds;
}) {
  await db.sensorReading.create({
    data: {
      assetId: input.assetId,
      metric: input.metric,
      value: input.value,
      unit: input.unit,
    },
  });

  const outcome = evaluateReading(input.value, input.thresholds[input.metric]);

  bus.publish({
    kind: "telemetry.tick",
    assetCode: input.assetCode,
    at: new Date().toISOString(),
  });

  if (outcome !== "healthy") {
    // Update stored asset health if it worsened.
    const asset = await db.asset.findUnique({ where: { id: input.assetId } });
    const prev = asset?.healthStatus as HealthStatus | undefined;
    const shouldUpdate =
      prev === undefined ||
      (outcome === "critical" && prev !== "critical") ||
      (outcome === "monitor" && prev === "healthy");
    if (shouldUpdate) {
      await db.asset.update({
        where: { id: input.assetId },
        data: { healthStatus: outcome },
      });
      bus.publish({
        kind: "asset.status",
        assetCode: input.assetCode,
        status: outcome,
        at: new Date().toISOString(),
      });
    }
    raiseAlert({
      assetCode: input.assetCode,
      severity: outcome === "critical" ? "critical" : "warning",
      message: describeBreach(input.metric, input.value, input.unit, input.thresholds[input.metric]),
    });
    void appendAuditEvent({
      action: "facilities.threshold.breach",
      resourceType: "asset",
      resourceId: input.assetId,
      meta: {
        assetCode: input.assetCode,
        metric: input.metric,
        value: input.value,
        outcome,
      },
    });
  }

  return outcome;
}

function describeBreach(
  metric: SensorMetric,
  value: number,
  unit: string,
  t?: MetricThreshold,
): string {
  if (!t) return `${metric} out of band: ${value}${unit}`;
  if (t.min !== undefined && value < t.min)
    return `${labelMetric(metric)} below safe minimum (${value}${unit} < ${t.min}${unit})`;
  if (t.max !== undefined && value > t.max)
    return `${labelMetric(metric)} above safe maximum (${value}${unit} > ${t.max}${unit})`;
  return `${labelMetric(metric)} approaching threshold (${value}${unit})`;
}

export function labelMetric(m: SensorMetric): string {
  return {
    dissolved_oxygen: "Dissolved oxygen",
    pressure: "Pump pressure",
    temperature: "Water temperature",
  }[m];
}

/**
 * Reset an asset's health status and clear alerts derived from it —
 * used by scenario reset.
 */
export async function resetAssetHealth(code: string) {
  await db.asset.update({
    where: { code },
    data: { healthStatus: "healthy" },
  });
  bus.publish({
    kind: "asset.status",
    assetCode: code,
    status: "healthy",
    at: new Date().toISOString(),
  });
}
