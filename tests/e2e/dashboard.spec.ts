import { test, expect } from "@playwright/test";

test.describe("Discharge AI MVP", () => {
  test("ward dashboard loads after selecting user", async ({ page }) => {
    await page.goto("/wards/4A");
    await page.selectOption("select", { label: /Dr Sarah Mitchell/ });
    await expect(page.getByRole("heading", { name: "Ward discharge dashboard" })).toBeVisible({
      timeout: 15000,
    });
  });

  test("patient workspace shows AI draft banner", async ({ page }) => {
    await page.goto("/wards/4A");
    await page.selectOption("select", { label: /Dr Sarah Mitchell/ });
    await page.waitForSelector("table tbody tr");
    await page.getByRole("link").first().click();
    await expect(page.getByText("AI draft")).toBeVisible();
  });
});
