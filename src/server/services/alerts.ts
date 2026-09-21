import { bus } from "@/server/realtime/sse";

export type Alert = {
  id: string;
  assetCode: string;
  severity: "warning" | "critical";
  message: string;
  raisedAt: string;
  acknowledged: boolean;
};

/**
 * Ephemeral alert store — a ring buffer of the most recent alerts across
 * the environment. Alerts are transient: they raise, the AI + humans act
 * on them, and they become incidents. We keep the last N in memory to
 * back the Home Portal live feed and the Facilities watchlist banner.
 *
 * Not persisted: for the Phase 1 demo scope the source of truth for
 * historical alerts is the resulting `Incident` row.
 */

const MAX = 50;
const state: { list: Alert[] } = (globalThis as { __zooAlerts?: { list: Alert[] } }).__zooAlerts ??
  { list: [] };
if (process.env.NODE_ENV !== "production") {
  (globalThis as { __zooAlerts?: { list: Alert[] } }).__zooAlerts = state;
}

export function raiseAlert(input: Omit<Alert, "id" | "raisedAt" | "acknowledged">): Alert {
  const alert: Alert = {
    id: crypto.randomUUID(),
    raisedAt: new Date().toISOString(),
    acknowledged: false,
    ...input,
  };
  state.list.unshift(alert);
  if (state.list.length > MAX) state.list.length = MAX;
  bus.publish({
    kind: "alert.raised",
    alertId: alert.id,
    assetCode: alert.assetCode,
    severity: alert.severity,
    message: alert.message,
    at: alert.raisedAt,
  });
  return alert;
}

export function acknowledgeAlert(id: string): boolean {
  const a = state.list.find((x) => x.id === id);
  if (!a) return false;
  a.acknowledged = true;
  return true;
}

export function recentAlerts(limit = 20): Alert[] {
  return state.list.slice(0, limit);
}

export function clearAlerts() {
  state.list.length = 0;
}

export function openAlertCount(): number {
  return state.list.filter((a) => !a.acknowledged).length;
}
