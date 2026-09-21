import { TrendingUp } from "lucide-react";
import { requireModuleAccess } from "@/server/services/authz";
import { incidentVolumeSeries, summarizeMostRecent } from "@/server/services/executive";
import { PageContainer } from "@/components/shell/PageContainer";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ComponentReuseChip } from "@/components/ui/ComponentReuseChip";
import { ExecutiveKpiStrip } from "@/components/executive/KpiStrip";
import { AskData } from "@/components/executive/AskData";
import { Sparkline } from "@/components/executive/Sparkline";
import { ValueDonut } from "@/components/executive/ValueDonut";
import { SourcedSummaryCard } from "@/components/executive/SummaryCard";

export default async function ExecutivePage() {
  const { user } = await requireModuleAccess("executive", "read");

  const [series, summary] = await Promise.all([
    incidentVolumeSeries(30),
    summarizeMostRecent({ id: user.id, role: user.role }),
  ]);

  const total30 = series.reduce((s, v) => s + v, 0);

  return (
    <PageContainer
      eyebrow="Executive Intelligence Dashboard"
      title="Leadership picture, without the spreadsheet"
      description="Natural-language analytics, live KPIs, and auto-generated incident summaries with sourced answers."
      actions={<ComponentReuseChip label="Dashboard capability" />}
    >
      <div className="space-y-4">
        <AskData />

        <ExecutiveKpiStrip />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <CardTitle>Incident volume · 30 days</CardTitle>
              </div>
              <p className="text-[11px] text-slate-500">{total30} total</p>
            </CardHeader>
            <CardBody>
              <Sparkline values={series.length > 0 ? series : [0]} width={600} height={72} />
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>30 days ago</span>
                <span>today</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <ValueDonut
                headline="~$46k saved"
                sub="31 hrs downtime avoided × $1,500/hr life-support cost"
                percent={92}
              />
            </CardBody>
          </Card>
        </div>

        {summary ? (
          <SourcedSummaryCard summary={summary} eyebrow="Latest incident · leadership summary" />
        ) : (
          <Card>
            <CardBody className="py-10 text-center text-sm text-slate-500">
              No incidents yet. Run the connected scenario to generate a leadership summary.
            </CardBody>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
