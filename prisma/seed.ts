/**
 * Seed the Zoo AI demo DB with synthetic data.
 *
 * Idempotent: safe to run multiple times. Truncates scenario-owned tables
 * (incidents, tasks, POs, audit events) and re-inserts baseline entities.
 *
 * Anchors the "connected scenario" (LSS-204 habitat life-support failure):
 *   - River's Edge habitat
 *   - LSS-204 asset with DO / pressure / temp thresholds
 *   - 90 days of steady-state telemetry (10-minute cadence)
 *   - 2026-05-14 shaft-seal maintenance record (recurring wear pattern)
 */

import {
  PrismaClient,
  RoleKey,
  ModuleKey,
  SensorMetric,
  HealthStatus,
} from "@prisma/client";

const db = new PrismaClient();

// ─── Config ─────────────────────────────────────────────────────────────

const TELEMETRY_DAYS = 90;
const TELEMETRY_INTERVAL_MIN = 10;

const ROLES: Array<{ key: RoleKey; name: string }> = [
  { key: "executive", name: "Executive" },
  { key: "facilities_mgr", name: "Facilities Manager" },
  { key: "curator", name: "Curator" },
  { key: "maintenance", name: "Maintenance Technician" },
  { key: "governance", name: "Security / Governance Admin" },
  { key: "staff", name: "General Staff" },
];

// Role x module matrix (canRead, canAct). See docs/rbac.md.
const ACCESS_MATRIX: Record<RoleKey, Partial<Record<ModuleKey, { read: boolean; act: boolean }>>> = {
  executive: {
    home: { read: true, act: false },
    knowledge: { read: true, act: false },
    facilities: { read: true, act: false },
    executive: { read: true, act: true },
    incidents: { read: true, act: false },
    security: { read: true, act: false },
  },
  facilities_mgr: {
    home: { read: true, act: true },
    knowledge: { read: true, act: true },
    facilities: { read: true, act: true },
    executive: { read: true, act: false },
    incidents: { read: true, act: true },
    security: { read: true, act: false },
  },
  curator: {
    home: { read: true, act: true },
    knowledge: { read: true, act: true },
    facilities: { read: true, act: false },
    executive: { read: true, act: false },
    incidents: { read: true, act: true },
    security: { read: false, act: false },
  },
  maintenance: {
    home: { read: true, act: true },
    knowledge: { read: true, act: false },
    facilities: { read: true, act: true },
    executive: { read: false, act: false },
    incidents: { read: true, act: true },
    security: { read: false, act: false },
  },
  governance: {
    home: { read: true, act: false },
    knowledge: { read: true, act: false },
    facilities: { read: true, act: false },
    executive: { read: true, act: false },
    incidents: { read: true, act: false },
    security: { read: true, act: true },
  },
  staff: {
    home: { read: true, act: false },
    knowledge: { read: true, act: false },
    facilities: { read: true, act: false },
    executive: { read: false, act: false },
    incidents: { read: false, act: false },
    security: { read: false, act: false },
  },
};

const USERS = [
  { email: "exec@zoo.demo", name: "Alex Executive", role: "executive" as const },
  { email: "facilities@zoo.demo", name: "Morgan Facilities", role: "facilities_mgr" as const },
  { email: "curator@zoo.demo", name: "Sam Curator", role: "curator" as const },
  { email: "maintenance@zoo.demo", name: "Jordan Maintenance", role: "maintenance" as const },
  { email: "governance@zoo.demo", name: "Riley Governance", role: "governance" as const },
  { email: "staff@zoo.demo", name: "Casey Staff", role: "staff" as const },
];

// ─── Helpers ────────────────────────────────────────────────────────────

function jitter(base: number, spread: number, i: number) {
  // Deterministic pseudo-noise so re-seeding produces identical telemetry.
  const s = Math.sin(i * 12.9898 + base * 78.233) * 43758.5453;
  const n = s - Math.floor(s);
  return base + (n - 0.5) * spread;
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding roles + access matrix…");

  // Roles + matrix (upsert-then-replace access rows)
  const roleIdByKey = new Map<RoleKey, string>();
  for (const r of ROLES) {
    const role = await db.role.upsert({
      where: { key: r.key },
      update: { name: r.name },
      create: { key: r.key, name: r.name },
    });
    roleIdByKey.set(r.key, role.id);
  }

  await db.roleModuleAccess.deleteMany();
  for (const [roleKey, modules] of Object.entries(ACCESS_MATRIX) as Array<
    [RoleKey, (typeof ACCESS_MATRIX)[RoleKey]]
  >) {
    const roleId = roleIdByKey.get(roleKey)!;
    for (const [mod, perm] of Object.entries(modules) as Array<
      [ModuleKey, { read: boolean; act: boolean }]
    >) {
      await db.roleModuleAccess.create({
        data: { roleId, module: mod, canRead: perm.read, canAct: perm.act },
      });
    }
  }

  console.log("Seeding users…");
  const userIdByEmail = new Map<string, string>();
  for (const u of USERS) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, roleId: roleIdByKey.get(u.role)! },
      create: {
        email: u.email,
        name: u.name,
        roleId: roleIdByKey.get(u.role)!,
      },
    });
    userIdByEmail.set(u.email, user.id);
  }
  const maintenanceUserId = userIdByEmail.get("maintenance@zoo.demo")!;

  console.log("Seeding River's Edge habitat + LSS-204 asset…");
  const habitat = await db.habitat.upsert({
    where: { id: "00000000-0000-0000-0000-0000000000a1" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-0000000000a1",
      name: "River's Edge",
      area: "Aquatic habitats — North wing",
    },
  });

  const asset = await db.asset.upsert({
    where: { code: "LSS-204" },
    update: {
      habitatId: habitat.id,
      healthStatus: HealthStatus.healthy,
      thresholds: {
        dissolved_oxygen: { min: 6.0, unit: "mg/L", nominal: 8.5 },
        pressure: { min: 22, max: 32, unit: "psi", nominal: 27 },
        temperature: { min: 20, max: 26, unit: "°C", nominal: 23 },
      },
    },
    create: {
      code: "LSS-204",
      name: "River's Edge Aquatic Life-Support System",
      category: "Life-support (aquatic)",
      habitatId: habitat.id,
      thresholds: {
        dissolved_oxygen: { min: 6.0, unit: "mg/L", nominal: 8.5 },
        pressure: { min: 22, max: 32, unit: "psi", nominal: 27 },
        temperature: { min: 20, max: 26, unit: "°C", nominal: 23 },
      },
      healthStatus: HealthStatus.healthy,
    },
  });

  console.log("Seeding maintenance history…");
  await db.maintenanceRecord.deleteMany({ where: { assetId: asset.id } });
  await db.maintenanceRecord.createMany({
    data: [
      {
        assetId: asset.id,
        performedAt: new Date("2025-11-08T09:00:00Z"),
        action: "Quarterly PM — filter media replacement, calibration",
        technicianId: maintenanceUserId,
        notes: "Routine PM. All readings nominal.",
        partsReplaced: { filter_media: 1, gaskets: 2 },
      },
      {
        assetId: asset.id,
        performedAt: new Date("2026-02-11T14:20:00Z"),
        action: "Quarterly PM — inspection, filter media replacement",
        technicianId: maintenanceUserId,
        notes: "Minor shaft-seal weep observed; monitored.",
        partsReplaced: { filter_media: 1 },
      },
      {
        assetId: asset.id,
        performedAt: new Date("2026-05-14T10:15:00Z"),
        action: "Shaft-seal replacement on primary pump LSS-204A",
        technicianId: maintenanceUserId,
        notes:
          "Replaced shaft seal after progression from weep to drip. Recurring wear pattern noted — recommend accelerated inspection cadence.",
        partsReplaced: { shaft_seal: 1, o_rings: 4 },
      },
    ],
  });

  console.log(`Seeding ${TELEMETRY_DAYS} days of telemetry (steady state)…`);
  await db.sensorReading.deleteMany({ where: { assetId: asset.id } });
  const now = new Date();
  const intervals = (TELEMETRY_DAYS * 24 * 60) / TELEMETRY_INTERVAL_MIN;
  const batch: Array<{
    assetId: string;
    metric: SensorMetric;
    value: number;
    unit: string;
    capturedAt: Date;
  }> = [];

  for (let i = 0; i < intervals; i++) {
    const at = new Date(now.getTime() - (intervals - i) * TELEMETRY_INTERVAL_MIN * 60_000);
    batch.push(
      {
        assetId: asset.id,
        metric: SensorMetric.dissolved_oxygen,
        value: Number(jitter(8.5, 0.6, i).toFixed(2)),
        unit: "mg/L",
        capturedAt: at,
      },
      {
        assetId: asset.id,
        metric: SensorMetric.pressure,
        value: Number(jitter(27, 1.5, i + 1).toFixed(1)),
        unit: "psi",
        capturedAt: at,
      },
      {
        assetId: asset.id,
        metric: SensorMetric.temperature,
        value: Number(jitter(23, 0.4, i + 2).toFixed(2)),
        unit: "°C",
        capturedAt: at,
      },
    );
    if (batch.length >= 3000) {
      await db.sensorReading.createMany({ data: batch });
      batch.length = 0;
    }
  }
  if (batch.length > 0) await db.sensorReading.createMany({ data: batch });

  // Reset scenario-owned tables so re-runs start clean.
  console.log("Resetting scenario-owned tables (incidents, POs, audit)…");
  await db.pOApproval.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.responsePlanStep.deleteMany();
  await db.incidentTask.deleteMany();
  await db.incident.deleteMany();
  await db.auditEvent.deleteMany();
  await db.aiInteraction.deleteMany();

  console.log("Baseline KPI snapshot…");
  await db.kpiSnapshot.deleteMany();
  const kpis = [
    { kpiKey: "systems_healthy", value: 1, unit: "count" },
    { kpiKey: "open_alerts", value: 0, unit: "count" },
    { kpiKey: "active_workflows", value: 0, unit: "count" },
    { kpiKey: "knowledge_queries_today", value: 0, unit: "count" },
    { kpiKey: "mttr_hours", value: 2.4, unit: "hours" },
    { kpiKey: "downtime_avoided_hours_mo", value: 31, unit: "hours" },
    { kpiKey: "incidents_auto_triaged_pct", value: 92, unit: "percent" },
  ];
  await db.kpiSnapshot.createMany({ data: kpis });

  console.log("✓ Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
