import { test, expect } from "@playwright/test";
import { loginAsDoctor } from "./helpers/auth";

test.describe("Discharge AI MVP", () => {
  test("ward dashboard loads after selecting user", async ({ page, baseURL }) => {
    await loginAsDoctor(page, baseURL);
    await page.goto("/wards/4A");
    await expect(page.getByRole("heading", { name: "Ward discharge dashboard" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("patient workspace shows AI draft banner", async ({ page, baseURL }) => {
    await loginAsDoctor(page, baseURL);
    await page.goto("/wards/4A");
    await page.locator("table tbody tr").first().waitFor({ state: "visible" });
    await page.locator("table tbody tr").first().getByRole("link").click();
    await expect(page.getByText("Loading patient workspace…")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText("AI draft")).toBeVisible();
  });
});
