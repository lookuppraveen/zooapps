import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * tRPC request context — resolved once per request.
 *
 * Contains: DB client, current session (may be null for unauthenticated
 * requests), and an audit helper pre-scoped to the current actor.
 */
export async function createTRPCContext(_opts: { headers: Headers }) {
  const session = await auth();
  return {
    db,
    session,
    user: session?.user ?? null,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
