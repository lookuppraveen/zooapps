import type { RoleKey } from "@prisma/client";
import { OAuthTokenProvider } from "@/server/clients/oauth";
import { AgentBuilderClient } from "./agent-builder";
import { LocalAgentClient } from "./local";
import type { AgentClient } from "./types";

let sharedTokenProvider: OAuthTokenProvider | null = null;

function shouldUseMock(): boolean {
  if (process.env.USE_MOCK_ADAPTERS === "true") return true;
  return !process.env.AGENT_BASE_URL || !process.env.AGENT_CLIENT_ID;
}

function getTokenProvider(): OAuthTokenProvider {
  if (sharedTokenProvider) return sharedTokenProvider;
  sharedTokenProvider = new OAuthTokenProvider({
    label: "agent-builder",
    tokenUrl: process.env.AGENT_TOKEN_URL!,
    clientId: process.env.AGENT_CLIENT_ID!,
    clientSecret: process.env.AGENT_CLIENT_SECRET!,
  });
  return sharedTokenProvider;
}

export function createAgentClient(actor?: { id: string; role: RoleKey }): AgentClient {
  if (shouldUseMock()) return new LocalAgentClient();
  return new AgentBuilderClient({
    baseUrl: process.env.AGENT_BASE_URL!,
    tokenProvider: getTokenProvider(),
    actorId: actor?.id,
    actorRole: actor?.role,
  });
}

export function agentMode(): "agent-builder" | "local" {
  return shouldUseMock() ? "local" : "agent-builder";
}

export type { AgentClient } from "./types";
