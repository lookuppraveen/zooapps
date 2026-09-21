import { router, createCallerFactory } from "./init";
import { healthRouter } from "./routers/health";
import { portalRouter } from "./routers/portal";
import { facilitiesRouter } from "./routers/facilities";
import { knowledgeRouter } from "./routers/knowledge";
import { incidentsRouter } from "./routers/incidents";
import { procurementRouter } from "./routers/procurement";
import { scenarioRouter } from "./routers/scenario";
import { executiveRouter } from "./routers/executive";
import { securityRouter } from "./routers/security";

export const appRouter = router({
  health: healthRouter,
  portal: portalRouter,
  facilities: facilitiesRouter,
  knowledge: knowledgeRouter,
  incidents: incidentsRouter,
  procurement: procurementRouter,
  scenario: scenarioRouter,
  executive: executiveRouter,
  security: securityRouter,
});

export type AppRouter = typeof appRouter;

/** For server-side (RSC / server action) calls without an HTTP round-trip. */
export const createCaller = createCallerFactory(appRouter);
