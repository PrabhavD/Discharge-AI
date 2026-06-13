import { test, expect } from "@playwright/test";
import { resetJaneDemoEncounter } from "../helpers/reset-workflow-patient";
import {
  JANE_DEMO_ENCOUNTER_ID,
  loginAsUser,
  ADMIN_USER_ID,
  answerQuestion,
  resolveAllTasksAndBlockers,
} from "./helpers/auth";

test.describe("Jane Demo full discharge workflow", () => {
  test.setTimeout(120_000);

  test.beforeEach(async () => {
    await resetJaneDemoEncounter();
  });

  test("completes discharge from questionnaire through task/blocker resolve to final approval", async ({
    page,
    baseURL,
  }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await loginAsUser(page, ADMIN_USER_ID, baseURL);
    await page.goto(`/encounters/${JANE_DEMO_ENCOUNTER_ID}`);
    await expect(page.getByRole("heading", { name: /Demo, Jane/i })).toBeVisible();

    await page.getByTestId("tab-questionnaire").click();
    await answerQuestion(page, "Has pharmacy screened the discharge prescription?", "Yes");
    await answerQuestion(page, "Are TTO/TTA medications prescribed?", "Yes");
    await answerQuestion(page, "Has occupational therapy cleared the patient?", "Yes");
    await answerQuestion(page, "Has physiotherapy cleared the patient?", "Yes");
    await answerQuestion(page, "Has family or next of kin been updated?", "Yes");
    await answerQuestion(page, "Can family collect?", "Yes");

    await page.getByTestId("tab-summary").click();
    await page.getByTestId("generate-ai-plan").click();
    await expect(page.getByText("Generating…")).toBeHidden({ timeout: 30_000 });

    await page.getByTestId("tab-tasks").click();
    await expect(page.getByTestId("task-blocker-panel")).toBeVisible();
    await expect(
      page.getByTestId("task-mark-done").or(page.getByTestId("blocker-resolve")).first()
    ).toBeVisible({ timeout: 15_000 });
    await resolveAllTasksAndBlockers(page);
    await expect(page.getByTestId("no-active-blockers")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("no-active-tasks")).toBeVisible({ timeout: 10_000 });

    await expect
      .poll(async () => {
        const workspaceRes = await page.request.get(
          `${baseURL}/api/encounters/${JANE_DEMO_ENCOUNTER_ID}/discharge-workspace`
        );
        const workspace = await workspaceRes.json();
        return workspace.checklist.activeBlockerCount as number;
      })
      .toBe(0);

    await page.getByTestId("tab-documents").click();
    const approveDoc = page.getByTestId("approve-document");
    if ((await approveDoc.count()) === 0) {
      await page.getByTestId("generate-discharge-summary").click();
      await expect(page.getByTestId("approve-document")).toBeVisible({ timeout: 15_000 });
    }

    const planRes = await page.request.get(
      `${baseURL}/api/encounters/${JANE_DEMO_ENCOUNTER_ID}/ai/discharge-plan`
    );
    const planData = await planRes.json();
    const planId = planData.plan?.id as string | undefined;

    const docsRes = await page.request.get(
      `${baseURL}/api/encounters/${JANE_DEMO_ENCOUNTER_ID}/documents`
    );
    const docsData = await docsRes.json();
    const summaries = (docsData.documents ?? []).filter(
      (d: { type: string }) => d.type === "DISCHARGE_SUMMARY"
    );
    const linkedSummary = summaries.find(
      (d: { dischargePlanId?: string; status: string }) =>
        d.dischargePlanId === planId && d.status !== "APPROVED"
    );
    const summaryToApprove = linkedSummary ?? summaries.find((d: { status: string }) => d.status !== "APPROVED");

    if (summaryToApprove) {
      const approveResponse = await page.request.post(
        `${baseURL}/api/documents/${summaryToApprove.id}`,
        { data: {} }
      );
      expect(approveResponse.ok()).toBeTruthy();
    }

    await page.getByTestId("tab-approval").click();
    await page.getByTestId("check-approval-requirements").click();

    await page.getByTestId("approval-override").fill(
      "Automated workflow test override — clinician confirms safe to proceed despite RED domain snapshot."
    );
    await page.getByTestId("approval-confirm").check();

    const [approvePlanResponse] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/discharge-plans/") &&
          r.url().includes("/approve") &&
          r.request().method() === "POST"
      ),
      page.getByTestId("final-approve-plan").click(),
    ]);
    if (!approvePlanResponse.ok()) {
      const body = await approvePlanResponse.json().catch(() => ({}));
      throw new Error(`Plan approval failed (${approvePlanResponse.status()}): ${body.error ?? JSON.stringify(body)}`);
    }

    await expect
      .poll(async () => {
        const ws = await page.request.get(
          `${baseURL}/api/encounters/${JANE_DEMO_ENCOUNTER_ID}/discharge-workspace`
        );
        const data = await ws.json();
        return data.checklist.planApprovalStatus as string;
      })
      .toBe("APPROVED");

    await expect(page.getByTestId("plan-approval-status")).toHaveText("APPROVED");

    await page.getByTestId("tab-audit").click();

    await expect
      .poll(async () => {
        const auditRes = await page.request.get(
          `${baseURL}/api/encounters/${JANE_DEMO_ENCOUNTER_ID}/audit`
        );
        const audit = await auditRes.json();
        const types = (audit.events ?? []).map((e: { eventType: string }) => e.eventType);
        return {
          blockerResolved: types.includes("BLOCKER_RESOLVED"),
          documentApproved: types.includes("DOCUMENT_APPROVED"),
          finalApproval: types.includes("FINAL_DISCHARGE_APPROVAL"),
        };
      })
      .toEqual({
        blockerResolved: true,
        documentApproved: true,
        finalApproval: true,
      });

    const auditTable = page.locator("table tbody");
    await expect(auditTable.getByText("FINAL_DISCHARGE_APPROVAL").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
