import type { Page } from "@playwright/test";

export const DOCTOR_USER_ID = "user-doctor-1";
export const ADMIN_USER_ID = "user-admin-1";
export const JANE_DEMO_ENCOUNTER_ID = "enc-H001";

export async function loginAsUser(page: Page, userId: string, baseURL = "http://localhost:3000") {
  const res = await page.request.post(`${baseURL}/api/auth/session`, {
    data: { userId },
  });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()}`);
  }
}

export async function loginAsDoctor(page: Page, baseURL = "http://localhost:3000") {
  return loginAsUser(page, DOCTOR_USER_ID, baseURL);
}

export async function answerQuestion(
  page: Page,
  questionText: string,
  answer: "Yes" | "No" | "Unknown"
) {
  const container = page.getByTestId("question-item").filter({ hasText: questionText });
  await container.getByRole("button", { name: new RegExp(`^${answer}$`, "i") }).click();
}

export async function resolveAllTasksAndBlockers(page: Page) {
  await page.getByTestId("task-blocker-loading").waitFor({ state: "hidden", timeout: 15_000 });

  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    const markDone = page.getByTestId("task-mark-done");
    const resolve = page.getByTestId("blocker-resolve");
    const markDoneCount = await markDone.count();
    const resolveCount = await resolve.count();
    if (markDoneCount === 0 && resolveCount === 0) break;

    if (markDoneCount > 0) {
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("/api/tasks/") && r.request().method() === "PATCH"
        ),
        markDone.first().click(),
      ]);
    } else if (resolveCount > 0) {
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("/api/blockers/") && r.request().method() === "PATCH"
        ),
        resolve.first().click(),
      ]);
    }

    await page.waitForTimeout(200);
  }
}
