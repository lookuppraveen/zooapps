import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/root";
import { createTRPCContext } from "@/server/trpc/context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError({ error, path }) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[trpc] ${path ?? "<no-path>"} — ${error.code}: ${error.message}`);
      }
    },
  });
}

export { handler as GET, handler as POST };
