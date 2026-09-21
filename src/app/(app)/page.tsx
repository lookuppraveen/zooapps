import { auth } from "@/auth";
import { readableModules } from "@/lib/rbac";
import { PageContainer } from "@/components/shell/PageContainer";
import { KpiStrip } from "@/components/home/KpiStrip";
import { AlertFeed } from "@/components/home/AlertFeed";
import { ModuleLaunchpad } from "@/components/home/ModuleLaunchpad";

function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePortalPage() {
  const session = await auth();
  const user = session!.user; // guarded by (app) layout
  const visible = await readableModules(user.role);

  return (
    <PageContainer
      eyebrow="Home Portal"
      title={`${greeting()}, ${user.name?.split(" ")[0] ?? "there"}`}
      description={`Signed in as ${user.roleName}. KPIs, live alerts and the connected scenario launch from here.`}
    >
      <KpiStrip />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ModuleLaunchpad visible={visible} />
        </div>
        <AlertFeed />
      </div>
    </PageContainer>
  );
}
