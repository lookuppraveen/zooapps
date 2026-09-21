import type { RoleKey } from "@prisma/client";
import { OAuthTokenProvider } from "@/server/clients/oauth";
import { DashboardHttpClient } from "./dashboard";
import { LocalDashboardClient } from "./local";
import type { DashboardClient } from "./types";

let sharedTokenProvider: OAuthTokenProvider | null = null;

function shouldUseMock(): boolean {
  if (process.env.USE_MOCK_ADAPTERS === "true") return true;
  return !process.env.DASHBOARD_BASE_URL || !process.env.DASHBOARD_CLIENT_ID;
}

function getTokenProvider(): OAuthTokenProvider {
  if (sharedTokenProvider) return sharedTokenProvider;
  sharedTokenProvider = new OAuthTokenProvider({
    label: "dashboard",
    tokenUrl: process.env.DASHBOARD_TOKEN_URL!,
    clientId: process.env.DASHBOARD_CLIENT_ID!,
    clientSecret: process.env.DASHBOARD_CLIENT_SECRET!,
  });
  return sharedTokenProvider;
}

export function createDashboardClient(actor?: { id: string; role: RoleKey }): DashboardClient {
  if (shouldUseMock()) return new LocalDashboardClient();
  return new DashboardHttpClient({
    baseUrl: process.env.DASHBOARD_BASE_URL!,
    tokenProvider: getTokenProvider(),
    actorId: actor?.id,
    actorRole: actor?.role,
  });
}

export function dashboardMode(): "dashboard" | "local" {
  return shouldUseMock() ? "local" : "dashboard";
}

export type { DashboardClient } from "./types";
