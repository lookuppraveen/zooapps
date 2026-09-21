import { EventEmitter } from "node:events";

/**
 * In-process event bus for real-time UI updates.
 *
 * Serverless caveat (Vercel): each cold-start / instance has its own
 * EventEmitter, so cross-instance broadcast requires an external pub/sub
 * (Redis, Pusher, Supabase Realtime). For the Phase 1 demo we run a
 * single Next dev/prod process, which makes in-memory perfectly adequate.
 *
 * Public shape: `bus.publish(evt)` from services, `subscribe(cb)` from
 * the SSE route.
 */

export type ZooEvent =
  | { kind: "alert.raised"; alertId: string; assetCode: string; severity: "warning" | "critical"; message: string; at: string }
  | { kind: "incident.opened"; incidentCode: string; assetCode: string; at: string }
  | { kind: "incident.updated"; incidentCode: string; at: string }
  | { kind: "scenario.step"; step: number; label: string; at: string }
  | { kind: "kpi.changed"; key: string; value: number; at: string }
  | { kind: "telemetry.tick"; assetCode: string; at: string }
  | { kind: "asset.status"; assetCode: string; status: "healthy" | "monitor" | "critical"; at: string };

const CHANNEL = "zoo:event";

class ZooEventBus {
  private emitter = new EventEmitter();
  constructor() {
    // Silence Node's default max-listeners warning; SSE clients come and go.
    this.emitter.setMaxListeners(1024);
  }

  publish(evt: ZooEvent) {
    this.emitter.emit(CHANNEL, evt);
  }

  subscribe(cb: (evt: ZooEvent) => void) {
    this.emitter.on(CHANNEL, cb);
    return () => this.emitter.off(CHANNEL, cb);
  }
}

// Preserve across hot reloads in dev.
const globalForBus = globalThis as unknown as { zooBus?: ZooEventBus };
export const bus = globalForBus.zooBus ?? new ZooEventBus();
if (process.env.NODE_ENV !== "production") globalForBus.zooBus = bus;

/**
 * Server-Sent Events response body for a Next.js Route Handler.
 *   export const GET = () => sseResponse();
 */
export function sseResponse(): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (evt: ZooEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
        } catch {
          /* client closed */
        }
      };
      const unsub = bus.subscribe(send);
      // Heartbeat every 15s so proxies / browsers keep the connection open.
      const hb = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* closed */
        }
      }, 15_000);
      // Cleanup on abort.
      const close = () => {
        unsub();
        clearInterval(hb);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      // The stream will be closed by the caller on client disconnect.
      controller.enqueue(encoder.encode(": connected\n\n"));
      // @ts-expect-error signal not on ReadableStreamDefaultController but exposed via controller
      controller.signal?.addEventListener?.("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
