"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type SSEState = "connecting" | "open" | "closed";

/**
 * Sidebar footer widget that proves three things at once:
 *   1. tRPC client → server round-trip (`health.whoami`)
 *   2. SSE stream is open (`/api/sse`)
 *   3. Session/role from step 4 is what the server sees
 *
 * Ships with the shell so every screen visibly confirms the pipe is alive.
 */
export function ConnectionStatus() {
  const whoami = trpc.health.whoami.useQuery(undefined, {
    staleTime: 60_000,
  });
  const [sse, setSse] = useState<SSEState>("connecting");

  useEffect(() => {
    const es = new EventSource("/api/sse");
    const onOpen = () => setSse("open");
    const onError = () => setSse("closed");
    es.addEventListener("open", onOpen);
    es.addEventListener("error", onError);
    return () => {
      es.removeEventListener("open", onOpen);
      es.removeEventListener("error", onError);
      es.close();
    };
  }, []);

  const trpcOk = whoami.isSuccess && !!whoami.data;
  const sseColor =
    sse === "open"
      ? "bg-status-healthy"
      : sse === "connecting"
        ? "bg-status-monitor"
        : "bg-status-critical";
  const trpcColor = trpcOk ? "bg-status-healthy" : whoami.isLoading ? "bg-status-monitor" : "bg-status-critical";

  return (
    <div className="border-t border-white/10 px-5 py-4 text-[10px] text-slate-400">
      <div className="mb-2 flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5" title="tRPC">
          <span className={cn("h-1.5 w-1.5 rounded-full", trpcColor)} />
          <span>tRPC</span>
        </span>
        <span className="inline-flex items-center gap-1.5" title="Server-Sent Events">
          <span className={cn("h-1.5 w-1.5 rounded-full", sseColor)} />
          <span>SSE</span>
        </span>
      </div>
      <p>v0.1.0 · Phase 1 demo</p>
      <p className="mt-0.5 text-slate-500">Reused: AI Squad · OIP · ProcureChain</p>
    </div>
  );
}
