import { router, protectedProcedure } from "../init";
import { scenario, SCENARIO_STEPS } from "@/server/services/scenario";

export const scenarioRouter = router({
  state: protectedProcedure.query(() => scenario.getSnapshot()),

  steps: protectedProcedure.query(() => SCENARIO_STEPS),

  start: protectedProcedure.mutation(({ ctx }) =>
    scenario.start({ id: ctx.user.id, role: ctx.user.role }),
  ),

  reset: protectedProcedure.mutation(({ ctx }) =>
    scenario.reset({ id: ctx.user.id, role: ctx.user.role }),
  ),
});
