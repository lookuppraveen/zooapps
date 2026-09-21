import type { RoleKey } from "@prisma/client";
import type { OAuthTokenProvider } from "@/server/clients/oauth";
import { ResponsePlanSchema, type AgentClient, type ResponsePlan } from "./types";

/**
 * Agent Builder adapter (HTTP). Same conventions as the OIP adapter:
 * OAuth Bearer, timeouts, retries, 401 auto-recovery, Zod validation.
 * Response planning gets the long 30s timeout (LLM-backed).
 */
export class AgentBuilderClient implements AgentClient {
  constructor(
    private readonly config: {
      baseUrl: string;
      tokenProvider: OAuthTokenProvider;
      actorId?: string;
      actorRole?: RoleKey;
    },
  ) {}

  async planIncidentResponse(input: {
    alert: {
      assetCode: string;
      severity: "warning" | "critical";
      message: string;
      metric?: string;
    };
    context: string;
    roleScope: RoleKey;
  }): Promise<ResponsePlan> {
    const json = await this.fetch<unknown>(
      "/plan/incident",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
      30_000,
    );
    return ResponsePlanSchema.parse(json);
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
      if (!res.ok) throw new Error(`Agent Builder ${path} failed: ${res.status} ${res.statusText}`);
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
