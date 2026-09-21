"use client";

import { useEffect } from "react";
import { AlertOctagon } from "lucide-react";

/**
 * Global error boundary. Catches uncaught exceptions in server or client
 * components below the root layout — so a runtime crash during a live
 * demo doesn't leave the audience staring at a blank screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Real deployments ship this to Sentry / observability.
    console.error("[app] uncaught error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="max-w-md rounded-card border border-status-critical/30 bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-critical/10 text-status-critical">
          <AlertOctagon className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-nav">Something went wrong</h1>
        <p className="mt-1 text-sm text-slate-600">
          The screen you were on hit an unexpected error. Your session and data are safe.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[10px] text-slate-400">Ref: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 inline-block rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
