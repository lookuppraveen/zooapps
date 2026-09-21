import { requireModuleAccess } from "@/server/services/authz";
import { PageContainer } from "@/components/shell/PageContainer";
import { ComponentReuseChip } from "@/components/ui/ComponentReuseChip";
import { Chat } from "@/components/knowledge/Chat";
import { CorpusRail } from "@/components/knowledge/CorpusRail";

export default async function KnowledgePage() {
  await requireModuleAccess("knowledge", "read");

  return (
    <PageContainer
      eyebrow="Organizational Knowledge Assistant"
      title="Grounded answers with citations"
      description="Ask operational questions in plain language. Every answer returns verifiable citations to the source document and section — role-scoped to the corpus you can access."
      actions={<ComponentReuseChip label="OIP document intelligence" />}
    >
      <div className="grid h-[calc(100vh-16rem)] grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-h-0 lg:col-span-2">
          <Chat />
        </div>
        <CorpusRail />
      </div>
    </PageContainer>
  );
}
