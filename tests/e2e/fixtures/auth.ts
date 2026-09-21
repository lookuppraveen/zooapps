import { test as base, expect, type Page } from "@playwright/test";
export type { Page };

export const DEMO_USERS = {
  executive: "exec@zoo.demo",
  facilities: "facilities@zoo.demo",
  curator: "curator@zoo.demo",
  maintenance: "maintenance@zoo.demo",
  governance: "governance@zoo.demo",
  staff: "staff@zoo.demo",
} as const;

export type DemoRole = keyof typeof DEMO_USERS;

export async function signInAs(page: Page, role: DemoRole) {
  const email = DEMO_USERS[role];
  await page.goto("/login");
  const form = page.locator(`form:has(input[name="email"][value="${email}"])`);
  await expect(form).toBeVisible();
  await form.locator('button[type="submit"]').click();
  await page.waitForURL("/", { timeout: 15_000 });
}

export const test = base.extend<{ signedInAs: (role: DemoRole) => Promise<void> }>({
  signedInAs: async ({ page }, use) => {
    await use((role) => signInAs(page, role));
  },
});

export { expect };
