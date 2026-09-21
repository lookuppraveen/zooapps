import type { RoleKey } from "@prisma/client";
import { OAuthTokenProvider } from "@/server/clients/oauth";
import { LocalKnowledgeClient } from "./local";
import { OIPKnowledgeClient } from "./oip";
import type { KnowledgeClient } from "./types";

/**
 * Factory: returns the real OIP HTTP client when configured, otherwise
 * the in-process Local client. Called per-request so we can propagate
 * the caller's identity into upstream audit headers.
 *
 * Env contract (see `.env.example`):
 *   OIP_BASE_URL / OIP_TOKEN_URL / OIP_CLIENT_ID / OIP_CLIENT_SECRET
 * When any of those are missing (or USE_MOCK_ADAPTERS=true) we fall
 * back to LocalKnowledgeClient.
 */

let sharedTokenProvider: OAuthTokenProvider | null = null;

function shouldUseMock(): boolean {
  if (process.env.USE_MOCK_ADAPTERS === "true") return true;
  return !process.env.OIP_BASE_URL || !process.env.OIP_CLIENT_ID;
}

function getTokenProvider(): OAuthTokenProvider {
  if (sharedTokenProvider) return sharedTokenProvider;
  sharedTokenProvider = new OAuthTokenProvider({
    label: "oip",
    tokenUrl: process.env.OIP_TOKEN_URL!,
    clientId: process.env.OIP_CLIENT_ID!,
    clientSecret: process.env.OIP_CLIENT_SECRET!,
  });
  return sharedTokenProvider;
}

export function createKnowledgeClient(actor?: {
  id: string;
  role: RoleKey;
}): KnowledgeClient {
  if (shouldUseMock()) {
    return new LocalKnowledgeClient();
  }
  return new OIPKnowledgeClient({
    baseUrl: process.env.OIP_BASE_URL!,
    tokenProvider: getTokenProvider(),
    actorId: actor?.id,
    actorRole: actor?.role,
  });
}

export function knowledgeMode(): "oip" | "local" {
  return shouldUseMock() ? "local" : "oip";
}

export type { KnowledgeClient } from "./types";
