import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="max-w-md rounded-card border border-slate-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-nav">Nothing here</h1>
        <p className="mt-1 text-sm text-slate-600">
          The page you&rsquo;re looking for doesn&rsquo;t exist in this workspace.
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
