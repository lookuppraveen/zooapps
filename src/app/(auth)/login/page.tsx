import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, KeyRound } from "lucide-react";
import { auth, signIn } from "@/auth";
import { db } from "@/lib/db";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

export default async function LoginPage() {
  const existing = await auth();
  if (existing?.user) redirect("/");

  const users = await db.user.findMany({
    include: { role: { select: { key: true, name: true } } },
    orderBy: { role: { key: "asc" } },
  });

  async function signInAs(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    await signIn("credentials", { email, redirectTo: "/" });
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-lg font-bold text-white shadow-card">
          Z
        </div>
        <h1 className="mt-3 text-xl font-semibold text-slate-nav">Zoo AI · Operational Intelligence</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to your demonstration workspace.</p>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-brand" aria-hidden="true" />
          <div>
            <CardTitle>Choose a role to sign in as</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">
              Demo login (D4). Password is not validated — pick a role to see the RBAC and audit trail from that perspective.
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {users.map((u) => (
            <form key={u.id} action={signInAs}>
              <input type="hidden" name="email" value={u.email} />
              <button
                type="submit"
                className="group flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-brand/40 hover:bg-brand/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-nav">{u.role.name}</p>
                  <p className="truncate text-xs text-slate-500">{u.name} · {u.email}</p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 group-hover:bg-brand/10 group-hover:text-brand">
                  Sign in
                </span>
              </button>
            </form>
          ))}
        </CardBody>
      </Card>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Every action after sign-in is written to the immutable audit trail (Step 5).
      </p>

      <p className="mt-2 text-center text-[11px] text-slate-400">
        <Link href="/" className="hover:underline">Return home</Link>
      </p>
    </div>
  );
}
