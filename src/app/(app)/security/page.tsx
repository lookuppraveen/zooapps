import { requireModuleAccess } from "@/server/services/authz";
import { PageContainer } from "@/components/shell/PageContainer";
import { ComponentReuseChip } from "@/components/ui/ComponentReuseChip";
import { GovernanceKpiStrip } from "@/components/security/GovernanceKpiStrip";
import { RoleMatrix } from "@/components/security/RoleMatrix";
import { AuditTimeline } from "@/components/security/AuditTimeline";

export default async function SecurityPage() {
  await requireModuleAccess("security", "read");

  return (
    <PageContainer
      eyebrow="Security & Governance Administration"
      title="Access, audit, and data governance"
      description="SSO/MFA, least-privilege RBAC, immutable audit trail, and data classification — the trust layer under every module."
      actions={<ComponentReuseChip label="AI Squad portal governance" />}
    >
      <div className="space-y-4">
        <GovernanceKpiStrip />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RoleMatrix />
          <AuditTimeline />
        </div>
      </div>
    </PageContainer>
  );
}
