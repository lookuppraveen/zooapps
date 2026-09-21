import { test, expect } from "./fixtures/auth";

test.describe("RBAC negative", () => {
  test("staff role is denied access to security module", async ({ signedInAs, page }) => {
    await signedInAs("staff");

    await page.goto("/security");

    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("Your role does not have access to this module"),
    ).toBeVisible();
  });
});
