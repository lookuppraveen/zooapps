-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('executive', 'facilities_mgr', 'curator', 'maintenance', 'governance', 'staff');

-- CreateEnum
CREATE TYPE "ModuleKey" AS ENUM ('home', 'knowledge', 'facilities', 'executive', 'incidents', 'security');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('healthy', 'monitor', 'critical');

-- CreateEnum
CREATE TYPE "SensorMetric" AS ENUM ('dissolved_oxygen', 'pressure', 'temperature');

-- CreateEnum
CREATE TYPE "IndexStatus" AS ENUM ('pending', 'indexing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "IncidentPriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'triaging', 'responding', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "KanbanColumn" AS ENUM ('todo', 'in_progress', 'review', 'done');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'sent');

-- CreateEnum
CREATE TYPE "AiInteractionKind" AS ENUM ('retrieval', 'answer', 'plan', 'summary');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" "RoleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" UUID NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_module_access" (
    "roleId" UUID NOT NULL,
    "module" "ModuleKey" NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT false,
    "canAct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_module_access_pkey" PRIMARY KEY ("roleId","module")
);

-- CreateTable
CREATE TABLE "habitats" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habitats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "habitatId" UUID NOT NULL,
    "thresholds" JSONB NOT NULL,
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'healthy',
    "lastPmAt" TIMESTAMP(3),
    "pmComplianceDue" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "metric" "SensorMetric" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "action" TEXT NOT NULL,
    "technicianId" UUID,
    "notes" TEXT,
    "partsReplaced" JSONB,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "roleScope" "RoleKey"[],
    "indexedAt" TIMESTAMP(3),
    "indexStatus" "IndexStatus" NOT NULL DEFAULT 'pending',
    "oipDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "section" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "roleScope" "RoleKey"[],

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "assetId" UUID NOT NULL,
    "priority" "IncidentPriority" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "mttrMinutes" INTEGER,
    "downtimeAvoidedHrs" DOUBLE PRECISION,
    "summary" TEXT,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_tasks" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "ownerId" UUID,
    "column" "KanbanColumn" NOT NULL DEFAULT 'todo',
    "order" INTEGER NOT NULL DEFAULT 0,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "incident_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response_plan_steps" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "citationIds" JSONB NOT NULL DEFAULT '[]',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "response_plan_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "incidentId" UUID,
    "vendor" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'draft',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "po_approvals" (
    "id" UUID NOT NULL,
    "poId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "po_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "actorRole" "RoleKey",
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_interactions" (
    "id" UUID NOT NULL,
    "kind" "AiInteractionKind" NOT NULL,
    "promptHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_snapshots" (
    "id" UUID NOT NULL,
    "kpiKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_code_key" ON "assets"("code");

-- CreateIndex
CREATE INDEX "assets_habitatId_idx" ON "assets"("habitatId");

-- CreateIndex
CREATE INDEX "sensor_readings_assetId_capturedAt_idx" ON "sensor_readings"("assetId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "sensor_readings_metric_capturedAt_idx" ON "sensor_readings"("metric", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "maintenance_records_assetId_performedAt_idx" ON "maintenance_records"("assetId", "performedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "documents_oipDocumentId_key" ON "documents"("oipDocumentId");

-- CreateIndex
CREATE INDEX "document_chunks_documentId_ordinal_idx" ON "document_chunks"("documentId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_code_key" ON "incidents"("code");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_assetId_openedAt_idx" ON "incidents"("assetId", "openedAt" DESC);

-- CreateIndex
CREATE INDEX "incident_tasks_incidentId_column_order_idx" ON "incident_tasks"("incidentId", "column", "order");

-- CreateIndex
CREATE INDEX "response_plan_steps_incidentId_ordinal_idx" ON "response_plan_steps"("incidentId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_externalId_key" ON "purchase_orders"("externalId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "po_approvals_poId_idx" ON "po_approvals"("poId");

-- CreateIndex
CREATE INDEX "audit_events_occurredAt_idx" ON "audit_events"("occurredAt" DESC);

-- CreateIndex
CREATE INDEX "audit_events_resourceType_resourceId_idx" ON "audit_events"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_events_actorId_occurredAt_idx" ON "audit_events"("actorId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "ai_interactions_createdAt_idx" ON "ai_interactions"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_interactions_userId_createdAt_idx" ON "ai_interactions"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "kpi_snapshots_kpiKey_capturedAt_idx" ON "kpi_snapshots"("kpiKey", "capturedAt" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_module_access" ADD CONSTRAINT "role_module_access_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_habitatId_fkey" FOREIGN KEY ("habitatId") REFERENCES "habitats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_tasks" ADD CONSTRAINT "incident_tasks_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_tasks" ADD CONSTRAINT "incident_tasks_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_plan_steps" ADD CONSTRAINT "response_plan_steps_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_approvals" ADD CONSTRAINT "po_approvals_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_approvals" ADD CONSTRAINT "po_approvals_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
