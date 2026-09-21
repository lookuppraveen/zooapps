import type { RoleKey } from "@prisma/client";
import type { OAuthTokenProvider } from "@/server/clients/oauth";
import {
  AnswerSchema,
  CorpusEntrySchema,
  PassageSchema,
  type Answer,
  type CorpusEntry,
  type KnowledgeClient,
  type Passage,
} from "./types";

/**
 * OIP document-intelligence adapter (HTTP).
 *
 * Contract is hand-drafted (see `types.ts`) — regenerate when the OIP
 * team ships their OpenAPI spec. Every call is:
 *   - Bearer-authed via the shared OAuthTokenProvider (I2)
 *   - Timeout-bounded (5s reads, 30s answers)
 *   - Retried up to 2 times on 5xx / network error with exp backoff
 *   - Auth-invalidated + retried once on 401
 *   - Validated with Zod on the way back
 *   - Carries X-Zoo-Actor-Id / X-Zoo-Role headers for upstream audit
 */
export class OIPKnowledgeClient implements KnowledgeClient {
  constructor(
    private readonly config: {
      baseUrl: string;
      tokenProvider: OAuthTokenProvider;
      actorId?: string;
      actorRole?: RoleKey;
    },
  ) {}

  async listCorpus(roleScope: RoleKey): Promise<CorpusEntry[]> {
    const json = await this.fetch<unknown>(
      `/corpus?roleScope=${encodeURIComponent(roleScope)}`,
      { method: "GET" },
      5_000,
    );
    return CorpusEntrySchema.array().parse(json);
  }

  async search(input: {
    query: string;
    roleScope: RoleKey;
    limit?: number;
  }): Promise<Passage[]> {
    const json = await this.fetch<unknown>(
      `/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      5_000,
    );
    return PassageSchema.array().parse(json);
  }

  async answer(input: {
    question: string;
    roleScope: RoleKey;
    context?: string;
  }): Promise<Answer> {
    const json = await this.fetch<unknown>(
      `/answer`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      30_000,
    );
    return AnswerSchema.parse(json);
  }

  // ─── plumbing ────────────────────────────────────────────────────────

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
      if (!res.ok) {
        throw new Error(`OIP ${path} failed: ${res.status} ${res.statusText}`);
      }
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
