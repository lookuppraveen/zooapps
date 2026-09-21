import { z } from "zod";
import { router, moduleProcedure } from "../init";
import {
  listAssets,
  getAssetByCode,
  latestReadings,
  metricSeries,
  maintenanceHistory,
} from "@/server/services/facilities";
import { telemetrySimulator } from "@/server/services/telemetry-simulator";

const read = moduleProcedure("facilities", "read");
const act = moduleProcedure("facilities", "act");

const codeInput = z.object({ code: z.string().min(1) });

export const facilitiesRouter = router({
  assets: read.query(async () => listAssets()),

  asset: read.input(codeInput).query(async ({ input }) => {
    const asset = await getAssetByCode(input.code);
    if (!asset) return null;
    const [readings, maint] = await Promise.all([
      latestReadings(asset.id),
      maintenanceHistory(asset.id),
    ]);
    return { asset, readings, maintenance: maint };
  }),

  telemetrySeries: read
    .input(
      z.object({
        code: z.string(),
        metric: z.enum(["dissolved_oxygen", "pressure", "temperature"]),
        hours: z.number().int().min(1).max(72).default(6),
        maxPoints: z.number().int().min(10).max(240).default(60),
      }),
    )
    .query(async ({ input }) => {
      const asset = await getAssetByCode(input.code);
      if (!asset) return [];
      return metricSeries(asset.id, input.metric, input.hours, input.maxPoints);
    }),

  simulatorStatus: read.query(() => ({ running: telemetrySimulator.isRunning() })),

  startSimulator: act.mutation(async () => {
    await telemetrySimulator.start();
    return { started: true };
  }),

  stopSimulator: act.mutation(() => {
    telemetrySimulator.stop();
    return { stopped: true };
  }),

  resetSimulator: act.mutation(async () => {
    await telemetrySimulator.reset();
    return { reset: true };
  }),
});
