import type { RoleKey } from "@prisma/client";
import { OAuthTokenProvider } from "@/server/clients/oauth";
import { LocalProcurementClient } from "./local";
import { ProcureChainClient } from "./procurechain";
import type { ProcurementClient } from "./types";

let sharedTokenProvider: OAuthTokenProvider | null = null;
let sharedLocalClient: LocalProcurementClient | null = null;

function shouldUseMock(): boolean {
  if (process.env.USE_MOCK_ADAPTERS === "true") return true;
  return !process.env.PROCURECHAIN_BASE_URL || !process.env.PROCURECHAIN_CLIENT_ID;
}

function getTokenProvider(): OAuthTokenProvider {
  if (sharedTokenProvider) return sharedTokenProvider;
  sharedTokenProvider = new OAuthTokenProvider({
    label: "procurechain",
    tokenUrl: process.env.PROCURECHAIN_TOKEN_URL!,
    clientId: process.env.PROCURECHAIN_CLIENT_ID!,
    clientSecret: process.env.PROCURECHAIN_CLIENT_SECRET!,
  });
  return sharedTokenProvider;
}

export function createProcurementClient(actor?: { id: string; role: RoleKey }): ProcurementClient {
  if (shouldUseMock()) {
    // Local client is stateful across requests (ephemeral externalId map),
    // so share one instance for the process lifetime.
    if (!sharedLocalClient) sharedLocalClient = new LocalProcurementClient();
    return sharedLocalClient;
  }
  return new ProcureChainClient({
    baseUrl: process.env.PROCURECHAIN_BASE_URL!,
    tokenProvider: getTokenProvider(),
    actorId: actor?.id,
    actorRole: actor?.role,
  });
}

export function procurementMode(): "procurechain" | "local" {
  return shouldUseMock() ? "local" : "procurechain";
}

export type { ProcurementClient } from "./types";
