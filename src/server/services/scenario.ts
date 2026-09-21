import type { RoleKey } from "@prisma/client";
import { bus } from "@/server/realtime/sse";
import { appendAuditEvent } from "./audit";
import { clearAlerts } from "./alerts";
import { telemetrySimulator } from "./telemetry-simulator";
import { resetAssetHealth } from "./facilities";
import { createIncidentFromAlert, resetIncidents } from "./incidents";

/**
 * Connected-scenario orchestrator (D5 + PDF §6). Drives the demo's
 * single narrative arc end-to-end:
 *
 *   0 · Reset environment
 *   1 · Sensor drift on LSS-204
 *   2 · Critical threshold breach — alert raised
 *   3 · Retrieving procedure + maintenance history
 *   4 · Opening incident, drafting plan + PO
 *   5 · Leadership summary generated
 *
 * The mutation returns immediately with `{started:true}` — the actual
 * run happens in the background, publishing `scenario.step` SSE events
 * so every open tab follows along without polling.
 */

export type ScenarioState = "idle" | "running" | "complete" | "failed";

type ScenarioSnapshot = {
  state: ScenarioState;
  step: number;
  label: string;
  startedAt: string | null;
  finishedAt: string | null;
  incidentCode: string | null;
  error: string | null;
};

const STEPS: Array<{ n: number; label: string }> = [
  { n: 0, label: "Resetting environment" },
  { n: 1, label: "Sensor drift detected on LSS-204" },
  { n: 2, label: "Critical threshold breach — alert raised" },
  { n: 3, label: "Retrieving emergency procedure and maintenance history" },
  { n: 4, label: "Opening incident, drafting response plan and PO" },
  { n: 5, label: "Complete — leadership summary ready" },
];

class ScenarioOrchestrator {
  private snapshot: ScenarioSnapshot = {
    state: "idle",
    step: 0,
    label: STEPS[0]!.label,
    startedAt: null,
    finishedAt: null,
    incidentCode: null,
    error: null,
  };

  getSnapshot(): ScenarioSnapshot {
    return { ...this.snapshot };
  }

  private emit(step: number) {
    const s = STEPS.find((x) => x.n === step);
    if (!s) return;
    this.snapshot.step = step;
    this.snapshot.label = s.label;
    bus.publish({
      kind: "scenario.step",
      step,
      label: s.label,
      at: new Date().toISOString(),
    });
  }

  /**
   * Start a scenario run. Returns immediately; the run continues in the
   * background. Idempotent while already running (returns current state).
   */
  async start(actor: { id: string; role: RoleKey }): Promise<ScenarioSnapshot> {
    if (this.snapshot.state === "running") return this.getSnapshot();

    this.snapshot = {
      state: "running",
      step: 0,
      label: STEPS[0]!.label,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      incidentCode: null,
      error: null,
    };

    void appendAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      action: "scenario.started",
      resourceType: "scenario",
    });

    // Fire and forget. Errors are captured on the snapshot; caller polls
    // or subscribes to SSE to observe progression.
    void this.run(actor).catch((err) => {
      this.snapshot.state = "failed";
      this.snapshot.error = err instanceof Error ? err.message : String(err);
      this.snapshot.finishedAt = new Date().toISOString();
      console.error("[scenario] run failed:", err);
    });

    return this.getSnapshot();
  }

  private async run(actor: { id: string; role: RoleKey }) {
    // Step 0: reset (fast — matters that the audience sees a clean board)
    this.emit(0);
    await telemetrySimulator.reset();
    clearAlerts();
    await resetIncidents();
    await resetAssetHealth("LSS-204");
    await sleep(600);

    // Step 1: kick the simulator; its scripted timeline handles the drift
    this.emit(1);
    await telemetrySimulator.start();
    // Simulator drifts through t=0/4/8/12s — the critical alert lands at ~12s.

    // Step 2: wait for the critical alert to fire (bus subscription)
    const critical = await waitForCriticalAlert(20_000);
    this.emit(2);

    // Small dramatic pause so the audience sees the transition in the UI
    await sleep(500);

    // Step 3: knowledge retrieval + plan (agent + PO drafting all cascade
    // from createIncidentFromAlert). We surface the retrieval phase first
    // so it visibly precedes the incident opening on the stepper.
    this.emit(3);
    await sleep(400);

    // Step 4: open incident (this internally calls agent + drafts PO)
    this.emit(4);
    const { incident } = await createIncidentFromAlert({
      alert: {
        assetCode: critical.assetCode,
        severity: "critical",
        message: critical.message,
      },
      actor,
    });
    this.snapshot.incidentCode = incident.code;

    // Step 5: leadership summary (Step 13 will fill in real DashboardClient
    // synthesis; the incident already carries the agent-generated summary
    // so the exec dashboard can display it immediately).
    await sleep(400);
    this.emit(5);
    this.snapshot.state = "complete";
    this.snapshot.finishedAt = new Date().toISOString();

    void appendAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      action: "scenario.completed",
      resourceType: "scenario",
      meta: { incidentCode: incident.code },
    });
  }

  async reset(actor: { id: string; role: RoleKey }): Promise<ScenarioSnapshot> {
    await telemetrySimulator.reset();
    clearAlerts();
    await resetIncidents();
    await resetAssetHealth("LSS-204");
    this.snapshot = {
      state: "idle",
      step: 0,
      label: STEPS[0]!.label,
      startedAt: null,
      finishedAt: null,
      incidentCode: null,
      error: null,
    };
    void appendAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      action: "scenario.reset",
      resourceType: "scenario",
    });
    return this.getSnapshot();
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForCriticalAlert(timeoutMs: number): Promise<{
  assetCode: string;
  message: string;
}> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      unsub();
      reject(new Error("Timed out waiting for critical alert"));
    }, timeoutMs);
    const unsub = bus.subscribe((evt) => {
      if (evt.kind === "alert.raised" && evt.severity === "critical") {
        clearTimeout(t);
        unsub();
        resolve({ assetCode: evt.assetCode, message: evt.message });
      }
    });
  });
}

// Hot-reload-safe singleton
const globalForScenario = globalThis as { __zooScenario?: ScenarioOrchestrator };
export const scenario = globalForScenario.__zooScenario ?? new ScenarioOrchestrator();
if (process.env.NODE_ENV !== "production") globalForScenario.__zooScenario = scenario;

export const SCENARIO_STEPS = STEPS;
