import { expect, Page, test } from "@playwright/test";
import { JobApplication, JobStatus } from "../src/lib/types";

const makeJob = (id: string, company: string): JobApplication => ({
  id,
  company,
  position: "Backend Engineer",
  location: "Remote",
  url: "",
  description: "Build APIs",
  notes: "",
  status: "saved" as JobStatus,
  linkedResumeId: null,
  interviewAt: "",
  followUpDate: "",
  coverLetter: "",
  requirements: [],
  timeline: [],
  createdAt: "2026-10-09T10:00:00Z",
  updatedAt: "2026-10-09T10:00:00Z",
});

async function mockJobs(page: Page, jobs: JobApplication[]) {
  await page.addInitScript((items) => {
    localStorage.setItem("cv_workspace_language", "en");
    for (const job of items) {
      localStorage.setItem(
        `job-draft-${job.id}`,
        JSON.stringify({ ...job, notes: "An unsaved note" }),
      );
    }
    localStorage.setItem("job-draft-unrelated", "Keep this draft");
  }, jobs);
  await page.route(/\/api\/jobs(?:\?.*)?$/, (route) =>
    route.fulfill({ json: jobs }),
  );
  await page.route(/\/api\/resumes(?:\?.*)?$/, (route) =>
    route.fulfill({ json: [] }),
  );
}

test("job deletion requires confirmation and cancel preserves the job and draft", async ({
  page,
}) => {
  const job = makeJob("confirm-job", "Confirmation Company");
  await mockJobs(page, [job]);
  let deleteCalls = 0;
  await page.route(`**/api/jobs/${job.id}`, (route) => {
    deleteCalls += 1;
    return route.fulfill({ status: 204 });
  });
  await page.goto("/jobs");
  await page.getByRole("button", { name: "Delete job", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this job?" });
  await expect(dialog).toContainText("submitted copies");
  await expect(dialog).toContainText("tailored CVs stay");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(deleteCalls).toBe(0);
  expect(
    await page.evaluate(
      (id) => localStorage.getItem(`job-draft-${id}`),
      job.id,
    ),
  ).not.toBeNull();
});

test("successful deletion removes only that draft and selects the next job", async ({
  page,
}) => {
  const first = makeJob("first-job", "First Company");
  const second = makeJob("second-job", "Second Company");
  await mockJobs(page, [first, second]);
  await page.route(`**/api/jobs/${first.id}`, (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto("/jobs");
  await page.getByRole("button", { name: "Delete job", exact: true }).click();
  await page.getByRole("button", { name: "Delete job permanently" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const rows = page.locator(".application-index-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(second.company);
  await expect(rows.first()).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      (id) => localStorage.getItem(`job-draft-${id}`),
      first.id,
    ),
  ).toBeNull();
  expect(
    await page.evaluate(
      (id) => localStorage.getItem(`job-draft-${id}`),
      second.id,
    ),
  ).not.toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem("job-draft-unrelated")),
  ).toBe("Keep this draft");
});

test("failed deletion retains the job and draft and allows retry to an empty list", async ({
  page,
}) => {
  const job = makeJob("retry-job", "Retry Company");
  await mockJobs(page, [job]);
  let deleteCalls = 0;
  await page.route(`**/api/jobs/${job.id}`, (route) => {
    deleteCalls += 1;
    return deleteCalls === 1
      ? route.fulfill({
          status: 503,
          json: { error: { code: "TEMPORARY_ERROR", message: "Please retry" } },
        })
      : route.fulfill({ status: 204 });
  });
  await page.goto("/jobs");
  await page.getByRole("button", { name: "Delete job", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this job?" });
  await dialog.getByRole("button", { name: "Delete job permanently" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Please retry");
  await expect(page.locator(".application-index-row")).toHaveCount(1);
  expect(
    await page.evaluate(
      (id) => localStorage.getItem(`job-draft-${id}`),
      job.id,
    ),
  ).not.toBeNull();
  await dialog.getByRole("button", { name: "Delete job permanently" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".application-index-row")).toHaveCount(0);
  await expect(page.locator(".application-stage-empty")).toBeVisible();
});
