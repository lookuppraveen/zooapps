/**
 * Shared OAuth 2.0 client-credentials token provider for proprietary
 * component adapters (OIP, Agent Builder, ProcureChain, Dashboard, AI
 * Squad Portal — per plan §I2).
 *
 * One instance per component: caches the access token in memory, refreshes
 * ~60s before expiry, and injects `Authorization: Bearer <token>` on every
 * outbound call. Never persists tokens to disk.
 */

type TokenRecord = {
  access_token: string;
  expires_at: number; // epoch ms
};

export class OAuthTokenProvider {
  private cache: TokenRecord | null = null;
  private inflight: Promise<TokenRecord> | null = null;

  constructor(
    private readonly config: {
      tokenUrl: string;
      clientId: string;
      clientSecret: string;
      scope?: string;
      label: string; // for logging
    },
  ) {}

  /**
   * Returns a currently-valid access token, refreshing as needed.
   * Concurrent callers share the same in-flight fetch.
   */
  async getToken(): Promise<string> {
    if (this.cache && this.cache.expires_at - Date.now() > 60_000) {
      return this.cache.access_token;
    }
    if (this.inflight) {
      const r = await this.inflight;
      return r.access_token;
    }
    this.inflight = this.fetchToken().finally(() => {
      this.inflight = null;
    });
    const r = await this.inflight;
    return r.access_token;
  }

  private async fetchToken(): Promise<TokenRecord> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
    if (this.config.scope) body.set("scope", this.config.scope);

    const res = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      throw new Error(
        `[oauth:${this.config.label}] token exchange failed: ${res.status} ${res.statusText}`,
      );
    }
    const json = (await res.json()) as {
      access_token: string;
      expires_in?: number;
      token_type?: string;
    };
    if (!json.access_token) {
      throw new Error(`[oauth:${this.config.label}] missing access_token in response`);
    }
    const ttlMs = (json.expires_in ?? 3600) * 1000;
    const rec: TokenRecord = {
      access_token: json.access_token,
      expires_at: Date.now() + ttlMs,
    };
    this.cache = rec;
    return rec;
  }

  /** Invalidate the cache — call on 401 responses. */
  invalidate() {
    this.cache = null;
  }
}
