import type { RoleKey } from "@prisma/client";
import type { OAuthTokenProvider } from "@/server/clients/oauth";
import {
  KpiSchema,
  SourcedSummarySchema,
  type DashboardClient,
  type Kpi,
  type SourcedSummary,
} from "./types";

export class DashboardHttpClient implements DashboardClient {
  constructor(
    private readonly config: {
      baseUrl: string;
      tokenProvider: OAuthTokenProvider;
      actorId?: string;
      actorRole?: RoleKey;
    },
  ) {}

  async kpis(scope: RoleKey): Promise<Kpi[]> {
    const json = await this.fetch<unknown>(`/kpis?scope=${encodeURIComponent(scope)}`, {
      method: "GET",
    }, 5_000);
    return KpiSchema.array().parse(json);
  }

  async askData(input: { question: string; scope: RoleKey }): Promise<SourcedSummary> {
    const json = await this.fetch<unknown>(
      "/ask",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
      30_000,
    );
    return SourcedSummarySchema.parse(json);
  }

  async summarizeIncident(input: {
    incidentId: string;
    scope: RoleKey;
  }): Promise<SourcedSummary> {
    const json = await this.fetch<unknown>(
      "/summarize/incident",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
      30_000,
    );
    return SourcedSummarySchema.parse(json);
  }

  private async fetch<T>(
    path: string,
    init: RequestInit,
    timeoutMs: number,
    attempt = 0,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const token = await this.config.tokenProvider.getToken();
      const headers = new Headers(init.headers ?? {});
      headers.set("Authorization", `Bearer ${token}`);
      if (this.config.actorId) headers.set("X-Zoo-Actor-Id", this.config.actorId);
      if (this.config.actorRole) headers.set("X-Zoo-Role", this.config.actorRole);
      const res = await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
      if (res.status === 401 && attempt === 0) {
        this.config.tokenProvider.invalidate();
        return this.fetch<T>(path, init, timeoutMs, attempt + 1);
      }
      if (res.status >= 500 && attempt < 2) {
        await this.backoff(attempt);
        return this.fetch<T>(path, init, timeoutMs, attempt + 1);
      }
      if (!res.ok) throw new Error(`Dashboard ${path} failed: ${res.status} ${res.statusText}`);
      return (await res.json()) as T;
    } catch (err) {
      if (
        err instanceof Error &&
        (err.name === "AbortError" || /fetch failed|ECONNREFUSED/i.test(err.message)) &&
        attempt < 2
      ) {
        await this.backoff(attempt);
        return this.fetch<T>(path, init, timeoutMs, attempt + 1);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private backoff(attempt: number) {
    const ms = 200 * Math.pow(2, attempt) + Math.random() * 100;
    return new Promise((r) => setTimeout(r, ms));
  }
}
