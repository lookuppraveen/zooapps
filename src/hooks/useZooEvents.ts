"use client";

import { useEffect, useRef } from "react";

// Structural copy of the server-side ZooEvent union so we can keep this
// file client-safe (no server-only imports).
export type ZooEvent =
  | { kind: "alert.raised"; alertId: string; assetCode: string; severity: "warning" | "critical"; message: string; at: string }
  | { kind: "incident.opened"; incidentCode: string; assetCode: string; at: string }
  | { kind: "incident.updated"; incidentCode: string; at: string }
  | { kind: "scenario.step"; step: number; label: string; at: string }
  | { kind: "kpi.changed"; key: string; value: number; at: string }
  | { kind: "telemetry.tick"; assetCode: string; at: string }
  | { kind: "asset.status"; assetCode: string; status: "healthy" | "monitor" | "critical"; at: string };

/**
 * Subscribe to the environment-wide SSE stream and dispatch to a callback.
 * The callback is stored in a ref so callers don't have to `useCallback`.
 * A single EventSource is opened per hook instance and torn down on
 * unmount.
 */
export function useZooEvents(onEvent: (evt: ZooEvent) => void, kinds?: ZooEvent["kind"][]) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    const es = new EventSource("/api/sse");
    const onMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as ZooEvent;
        if (!kinds || kinds.includes(data.kind)) cbRef.current(data);
      } catch {
        /* heartbeat / non-JSON */
      }
    };
    es.addEventListener("message", onMessage);
    return () => {
      es.removeEventListener("message", onMessage);
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kinds?.join(",")]);
}
