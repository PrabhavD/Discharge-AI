import { test, expect } from "@playwright/test";
import { resetJaneDemoEncounter } from "../helpers/reset-workflow-patient";
import {
  DOCTOR_USER_ID,
  JANE_DEMO_ENCOUNTER_ID,
  loginAsUser,
  resolveAllTasksAndBlockers,
} from "./helpers/auth";

/**
 * E2E verification of the doctor's "blocked → unblocked" patient workflow.
 *
 * Covers the failure modes the user reported:
 *  - States and selections must update immediately after clicking Resolve / Mark done
 *    (no full-page refresh, no stale UI, button moves the item to "Resolved")
 *  - Workspace status badge (overall RED/AMBER/GREEN) must change when blockers clear
 *  - Ward dashboard must reflect cleared blocker (badge + main blocker column)
 *  - Audit log records BLOCKER_RESOLVED and PLAN_STATUS_RECOMPUTED events
 */
test.describe("Doctor unblocking workflow — Jane Demo", () => {
  test.setTimeout(120_000);

  test.beforeEach(async () => {
    await resetJaneDemoEncounter();
  });

  test("doctor clears all blockers and the patient transitions from RED to GREEN", async ({
    page,
    baseURL,
  }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await loginAsUser(page, DOCTOR_USER_ID, baseURL);

    // Step 1: Ward dashboard shows Jane Demo as blocked with a red main-blocker entry.
    await page.goto("/wards/4A");
    const janeRow = page.getByTestId(`ward-row-${JANE_DEMO_ENCOUNTER_ID}`);
    await expect(janeRow).toBeVisible();
    await expect(
      page.getByTestId(`ward-blocker-${JANE_DEMO_ENCOUNTER_ID}`)
    ).toHaveText(/TTO not screened/i);

    // Step 2: Open patient workspace.
    await page.goto(`/encounters/${JANE_DEMO_ENCOUNTER_ID}`);
    await expect(page.getByRole("heading", { name: /Demo, Jane/i })).toBeVisible();

    // Step 3: Generate an AI discharge plan so the patient has a domain-status RAG.
    await page.getByTestId("generate-ai-plan").click();
    await expect(page.getByText("Generating…")).toBeHidden({ timeout: 30_000 });

    // The freshly generated plan should be RED or AMBER while the seeded blocker is unresolved.
    const initialOverall = await page.getByTestId("patient-overall-status").textContent();
    expect(["Blocker", "In progress"]).toContain(initialOverall?.trim());

    // Step 4: Go to the tasks tab — verify the seeded blocker is shown as active.
    await page.getByTestId("tab-tasks").click();
    await expect(page.getByTestId("task-blocker-panel")).toBeVisible();
    await expect(page.getByTestId("blocker-active").first()).toBeVisible({ timeout: 10_000 });

    // Snapshot the count of active items so we can verify each click actually moves something.
    const initialActiveBlockers = await page.getByTestId("blocker-active").count();
    expect(initialActiveBlockers).toBeGreaterThan(0);

    // Step 5: Resolve a single blocker and verify optimistic UI moves it before the next render.
    const firstResolveButton = page.getByTestId("blocker-resolve").first();
    await expect(firstResolveButton).toBeVisible();
    await firstResolveButton.click();
    // Optimistic: the active count must decrease (or no-active-blockers shows) within a frame.
    await expect
      .poll(async () => page.getByTestId("blocker-active").count(), { timeout: 5_000 })
      .toBeLessThan(initialActiveBlockers);

    // Verify the resolved item shows up in the "Resolved" subsection within the same panel.
    await expect(page.getByTestId("blocker-resolved").first()).toBeVisible({ timeout: 5_000 });

    // Step 6: Clear the rest in a loop.
    await resolveAllTasksAndBlockers(page);

    // Step 7: Verify both empty-state markers are visible.
    await expect(page.getByTestId("no-active-blockers")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("no-active-tasks")).toBeVisible({ timeout: 10_000 });

    // Step 8: Verify the API confirms the workflow is unblocked.
    await expect
      .poll(async () => {
        const res = await page.request.get(
          `${baseURL}/api/encounters/${JANE_DEMO_ENCOUNTER_ID}/discharge-workspace`
        );
        const data = await res.json();
        return data.checklist.activeBlockerCount as number;
      })
      .toBe(0);

    // Step 9: Verify the plan's overallStatus has been recomputed to GREEN.
    await expect
      .poll(async () => {
        const res = await page.request.get(
          `${baseURL}/api/encounters/${JANE_DEMO_ENCOUNTER_ID}/ai/discharge-plan`
        );
        const data = await res.json();
        return data.plan?.overallStatus as string;
      })
      .toBe("GREEN");

    // Step 10: The patient header status badge in the UI must reflect the live status.
    // Navigate back to summary so the workspace re-fetches the plan badge.
    await page.getByTestId("tab-summary").click();
    await expect(page.getByTestId("patient-overall-status")).toContainText("Complete", {
      timeout: 10_000,
    });

    // Step 11: Audit log records BLOCKER_RESOLVED and PLAN_STATUS_RECOMPUTED.
    await expect
      .poll(async () => {
        const res = await page.request.get(
          `${baseURL}/api/encounters/${JANE_DEMO_ENCOUNTER_ID}/audit`
        );
        const data = await res.json();
        const types = (data.events ?? []).map((e: { eventType: string }) => e.eventType);
        return {
          blockerResolved: types.includes("BLOCKER_RESOLVED"),
          statusRecomputed: types.includes("PLAN_STATUS_RECOMPUTED"),
        };
      })
      .toEqual({ blockerResolved: true, statusRecomputed: true });

    // Step 12: Ward dashboard reflects the cleared blocker once we navigate back.
    await page.goto("/wards/4A");
    const janeRowAfter = page.getByTestId(`ward-row-${JANE_DEMO_ENCOUNTER_ID}`);
    await expect(janeRowAfter).toBeVisible();
    await expect(janeRowAfter.getByText(/TTO not screened/i)).toBeHidden();
    await expect(
      page.getByTestId(`ward-blocker-${JANE_DEMO_ENCOUNTER_ID}`)
    ).toHaveText(/^—$/);
    await expect(
      page.getByTestId(`ward-status-${JANE_DEMO_ENCOUNTER_ID}`)
    ).toContainText("Complete");
  });

  test("PATCH failure surfaces an error and rolls back the optimistic update", async ({
    page,
    baseURL,
  }) => {
    await loginAsUser(page, DOCTOR_USER_ID, baseURL);
    await page.goto(`/encounters/${JANE_DEMO_ENCOUNTER_ID}`);
    await page.getByTestId("tab-tasks").click();
    await expect(page.getByTestId("blocker-active").first()).toBeVisible({ timeout: 10_000 });

    // Intercept the PATCH and respond 500 to simulate a server failure.
    await page.route("**/api/blockers/*", (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Simulated failure" }),
        });
      }
      return route.continue();
    });

    const initialActive = await page.getByTestId("blocker-active").count();
    await page.getByTestId("blocker-resolve").first().click();

    // Error banner must appear.
    await expect(page.getByTestId("task-blocker-error")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("task-blocker-error")).toContainText("Simulated failure");

    // Optimistic update must be rolled back — active count is back to original.
    await expect
      .poll(async () => page.getByTestId("blocker-active").count(), { timeout: 5_000 })
      .toBe(initialActive);
  });
});
