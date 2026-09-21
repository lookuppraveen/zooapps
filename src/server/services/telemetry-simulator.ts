import type { SensorMetric } from "@prisma/client";
import { getAssetByCode, ingestReading, resetAssetHealth } from "./facilities";
import { clearAlerts } from "./alerts";

/**
 * Scripted telemetry simulator for the LSS-204 connected scenario (D5).
 *
 * Not a general-purpose sensor emulator — only knows how to drive the one
 * story: a dissolved-oxygen + pressure drift on the River's Edge aquatic
 * life-support system that crosses the 6.0 mg/L threshold, triggering
 * the whole downstream chain (alert → knowledge → incident → PO → summary).
 *
 * Timing (real seconds):
 *   0s   baseline reading (nominal)
 *   4s   first drift — mild pressure dip, DO still in band
 *   8s   drift continues — DO nears threshold (monitor)
 *   12s  breach — DO below 6.0 mg/L, pressure below floor (critical)
 *   Simulator then idles; scenario orchestrator (Step 12) takes over.
 */

const SCENARIO_ASSET = "LSS-204";

type Timer = ReturnType<typeof setTimeout>;

class Simulator {
  private timers: Timer[] = [];
  private running = false;

  isRunning() {
    return this.running;
  }

  async start() {
    if (this.running) return;
    const asset = await getAssetByCode(SCENARIO_ASSET);
    if (!asset) throw new Error(`Asset ${SCENARIO_ASSET} not seeded`);
    this.running = true;

    const emit = async (
      atMs: number,
      readings: Array<{ metric: SensorMetric; value: number; unit: string }>,
    ) => {
      const t = setTimeout(() => {
        void (async () => {
          for (const r of readings) {
            await ingestReading({
              assetId: asset.id,
              assetCode: asset.code,
              metric: r.metric,
              value: r.value,
              unit: r.unit,
              thresholds: asset.thresholds,
            });
          }
        })();
      }, atMs);
      this.timers.push(t);
    };

    // Baseline (nominal)
    await emit(0, [
      { metric: "dissolved_oxygen", value: 8.4, unit: "mg/L" },
      { metric: "pressure", value: 27.1, unit: "psi" },
      { metric: "temperature", value: 23.1, unit: "°C" },
    ]);
    // 4s — mild dip
    await emit(4_000, [
      { metric: "dissolved_oxygen", value: 7.6, unit: "mg/L" },
      { metric: "pressure", value: 25.4, unit: "psi" },
      { metric: "temperature", value: 23.2, unit: "°C" },
    ]);
    // 8s — approaching threshold
    await emit(8_000, [
      { metric: "dissolved_oxygen", value: 6.4, unit: "mg/L" },
      { metric: "pressure", value: 23.1, unit: "psi" },
      { metric: "temperature", value: 23.4, unit: "°C" },
    ]);
    // 12s — critical breach
    await emit(12_000, [
      { metric: "dissolved_oxygen", value: 5.7, unit: "mg/L" },
      { metric: "pressure", value: 20.9, unit: "psi" },
      { metric: "temperature", value: 23.6, unit: "°C" },
    ]);
    // 16s — hand off to scenario orchestrator (Step 12); simulator stops.
    const stop = setTimeout(() => {
      this.running = false;
    }, 16_000);
    this.timers.push(stop);
  }

  stop() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.length = 0;
    this.running = false;
  }

  async reset() {
    this.stop();
    clearAlerts();
    await resetAssetHealth(SCENARIO_ASSET);
  }
}

// Hot-reload safe singleton
const globalForSim = globalThis as { __zooSim?: Simulator };
export const telemetrySimulator = globalForSim.__zooSim ?? new Simulator();
if (process.env.NODE_ENV !== "production") globalForSim.__zooSim = telemetrySimulator;
