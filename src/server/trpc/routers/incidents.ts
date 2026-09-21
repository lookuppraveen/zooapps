import { z } from "zod";
import { router, moduleProcedure } from "../init";
import {
  createIncidentFromAlert,
  getIncidentByCode,
  listIncidents,
  moveTask,
  resetIncidents,
} from "@/server/services/incidents";

const read = moduleProcedure("incidents", "read");
const act = moduleProcedure("incidents", "act");

export const incidentsRouter = router({
  list: read
    .input(z.object({ openOnly: z.boolean().default(false) }).default({ openOnly: false }))
    .query(({ input }) => listIncidents(input)),

  get: read.input(z.object({ code: z.string() })).query(({ input }) => getIncidentByCode(input.code)),

  openFromAlert: act
    .input(
      z.object({
        assetCode: z.string(),
        severity: z.enum(["warning", "critical"]),
        message: z.string(),
        metric: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const res = await createIncidentFromAlert({
        alert: input,
        actor: { id: ctx.user.id, role: ctx.user.role },
      });
      return {
        incidentCode: res.incident.code,
        incidentId: res.incident.id,
        suggestedPO: res.suggestedPO,
      };
    }),

  moveTask: act
    .input(
      z.object({
        taskId: z.string().uuid(),
        toColumn: z.enum(["todo", "in_progress", "review", "done"]),
      }),
    )
    .mutation(({ ctx, input }) =>
      moveTask({
        taskId: input.taskId,
        toColumn: input.toColumn,
        actor: { id: ctx.user.id, role: ctx.user.role },
      }),
    ),

  reset: act.mutation(async () => {
    await resetIncidents();
    return { reset: true };
  }),
});
