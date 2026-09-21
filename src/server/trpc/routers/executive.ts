import { z } from "zod";
import { router, moduleProcedure } from "../init";
import {
  askData,
  EXEC_MODE,
  EXEC_SUGGESTIONS,
  getExecKpis,
  incidentVolumeSeries,
  summarizeMostRecent,
} from "@/server/services/executive";

const read = moduleProcedure("executive", "read");
const act = moduleProcedure("executive", "act");

export const executiveRouter = router({
  mode: read.query(() => ({ mode: EXEC_MODE() })),

  kpis: read.query(({ ctx }) => getExecKpis({ id: ctx.user.id, role: ctx.user.role })),

  volumeSeries: read
    .input(z.object({ days: z.number().int().min(7).max(90).default(30) }).default({ days: 30 }))
    .query(({ input }) => incidentVolumeSeries(input.days)),

  suggestions: read.query(() => EXEC_SUGGESTIONS),

  summary: read.query(({ ctx }) => summarizeMostRecent({ id: ctx.user.id, role: ctx.user.role })),

  ask: act
    .input(z.object({ question: z.string().min(3).max(500) }))
    .mutation(({ ctx, input }) =>
      askData({ id: ctx.user.id, role: ctx.user.role }, input.question),
    ),
});
