import Link from "next/link";
import { AlertOctagon, Clock, ArrowRight } from "lucide-react";
import { requireModuleAccess } from "@/server/services/authz";
import { listIncidents } from "@/server/services/incidents";
import { PageContainer } from "@/components/shell/PageContainer";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { ComponentReuseChip } from "@/components/ui/ComponentReuseChip";

function relative(d: Date | string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}

export default async function IncidentsPage() {
  await requireModuleAccess("incidents", "read");
  const incidents = await listIncidents();

  const openStatuses = new Set(["open", "triaging", "responding"]);
  const open = incidents.filter((i) => openStatuses.has(i.status));
  const closed = incidents.filter((i) => !openStatuses.has(i.status));

  return (
    <PageContainer
      eyebrow="Incident & Workflow Assistant"
      title="Alert to resolution"
      description="AI-assembled response plans, kanban workflow, and auto-drafted procurement — with humans approving key steps."
      actions={<ComponentReuseChip label="Agent Builder + ProcureChain" />}
    >
      {incidents.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <AlertOctagon className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-slate-700">No incidents yet</p>
            <p className="max-w-sm text-xs text-slate-500">
              Run the connected scenario or hand off an alert from Facilities to see the AI response
              plan and kanban board.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          <Section title="Open" items={open} />
          {closed.length > 0 && <Section title="Recent" items={closed} />}
        </div>
      )}
    </PageContainer>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: Awaited<ReturnType<typeof listIncidents>>;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="grid grid-cols-1 gap-2">
        {items.map((i) => (
          <Link key={i.id} href={`/incidents/${i.code}` as never}>
            <Card className="transition-shadow hover:shadow-card-hover">
              <CardBody className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-nav">{i.code}</span>
                    <span className="text-[11px] text-slate-500">· {i.asset.code}</span>
                    <StatusChip
                      status={i.priority === "critical" ? "critical" : i.priority === "high" ? "monitor" : "healthy"}
                      label={i.priority}
                    />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-600">{i.summary ?? "—"}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    Opened {relative(i.openedAt)} · {i._count.tasks} tasks · {i._count.planSteps} plan steps
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
