
import Link from "next/link";
import { Lock } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="max-w-md rounded-card border border-slate-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-critical/10 text-status-critical">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-nav">Access denied</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your role does not have access to this module. This denial is recorded in the audit trail.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-light"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
