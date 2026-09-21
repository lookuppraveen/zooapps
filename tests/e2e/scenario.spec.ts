import { test, expect, type Page } from "./fixtures/auth";

test.describe.configure({ mode: "serial" });

/**
 * Scenario tests drive state via tRPC HTTP (page.request) rather than
 * the "Run scenario" button. Under `next dev`, a browser fetch POST
 * issued while the SSE stream is open never receives its response —
 * a Chromium/dev-server contention that does not occur under a
 * production build (`pnpm build && pnpm start`). These tests still
 * exercise the full server flow: auth → tRPC → scenario orchestrator
 * → telemetry simulator → incident creation.
 */

const TRPC_INPUT = encodeURIComponent(
  JSON.stringify({ "0": { json: null, meta: { values: ["undefined"], v: 1 } } }),
);
const TRPC_BODY = { "0": { json: null, meta: { values: ["undefined"], v: 1 } } };

async function callTrpc(page: Page, verb: "GET" | "POST", proc: string) {
  const url = `/api/trpc/${proc}?batch=1${verb === "GET" ? `&input=${TRPC_INPUT}` : ""}`;
  return verb === "POST"
    ? page.request.post(url, { data: TRPC_BODY, timeout: 180_000 })
    : page.request.get(url, { timeout: 30_000 });
}

type Snapshot = {
  state: string;
  step: number;
  incidentCode: string | null;
};

async function getScenarioState(page: Page): Promise<Snapshot> {
  const resp = await callTrpc(page, "GET", "scenario.state");
  const body = (await resp.json()) as Array<{ result?: { data?: { json?: Snapshot } } }>;
  const s = body?.[0]?.result?.data?.json;
  return { state: s?.state ?? "", step: s?.step ?? 0, incidentCode: s?.incidentCode ?? null };
}

async function waitForState(page: Page, target: "complete" | "idle", timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let last: Snapshot = { state: "", step: 0, incidentCode: null };
  while (Date.now() < deadline) {
    last = await getScenarioState(page);
    if (last.state === target) return last;
    if (last.state === "failed") throw new Error(`scenario failed at step ${last.step}`);
    await page.waitForTimeout(1_000);
  }
  throw new Error(`scenario never reached "${target}" (last=${JSON.stringify(last)})`);
}

test.describe("Connected scenario", () => {
  test.setTimeout(240_000);

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await page.goto("/login");
      await page
        .locator(`form:has(input[name="email"][value="facilities@zoo.demo"])`)
        .locator('button[type="submit"]')
        .click();
      await page.waitForURL("/", { timeout: 15_000 });
      // Warm up tRPC route + all lazily-imported services. First mutation
      // in `next dev` compiles the handler graph (60–120s on Windows).
      await callTrpc(page, "POST", "scenario.reset");
      await callTrpc(page, "POST", "scenario.start");
      await waitForState(page, "complete", 60_000);
      await callTrpc(page, "POST", "scenario.reset");
    } finally {
      await ctx.close();
    }
  });

  test.beforeEach(async ({ signedInAs, page }) => {
    await signedInAs("facilities");
    await callTrpc(page, "POST", "scenario.reset");
    const snap = await getScenarioState(page);
    expect(snap.state).toBe("idle");
  });

  test("runs the LSS-204 scenario from start to complete", async ({ page }) => {
    await callTrpc(page, "POST", "scenario.start");
    const snap = await waitForState(page, "complete", 45_000);

    expect(snap.step).toBe(5);
    expect(snap.incidentCode).toMatch(/^INC-/);
  });

  test("resets a completed scenario back to idle", async ({ page }) => {
    await callTrpc(page, "POST", "scenario.start");
    await waitForState(page, "complete", 45_000);

    await callTrpc(page, "POST", "scenario.reset");
    const snap = await waitForState(page, "idle", 10_000);

    expect(snap.step).toBe(0);
    expect(snap.incidentCode).toBeNull();
  });
});
