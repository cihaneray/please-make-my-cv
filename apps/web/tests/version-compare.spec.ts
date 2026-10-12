import { selectMenu } from "./helpers/select-menu";
import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:8101/api";

test("saved version and tailored CV compare against the unsaved draft", async ({
  page,
  request,
}) => {
  const firstResponse = await request.post(`${API}/resumes`, {
    data: { title: "Version comparison source", templateId: "technical" },
  });
  expect(firstResponse.ok()).toBeTruthy();
  const first = await firstResponse.json();
  const secondResponse = await request.post(
    `${API}/resumes/${first.metadata.id}/variants`,
    {
      data: {
        document: first,
        targetJob: {
          company: "Comparison Co",
          position: "Engineer",
          description: "Build reliable systems",
        },
      },
    },
  );
  expect(secondResponse.ok()).toBeTruthy();
  const variant = await secondResponse.json();
  expect(variant.metadata.parentResumeId).toBe(first.metadata.id);

  first.profile.firstName = "Saved version";
  const saved = await request.put(`${API}/resumes/${first.metadata.id}`, {
    data: { revision: 1, document: first },
  });
  expect(saved.ok()).toBeTruthy();

  await page.goto(`/resumes/${first.metadata.id}`);
  await page
    .getByRole("textbox", { name: "First Name", exact: true })
    .fill("Unsaved draft");
  await page.getByLabel("Compare revisions and variants").click();
  const dialog = page.getByRole("dialog", { name: "Compare versions" });
  await expect(dialog).toBeVisible();
  const selector = dialog.getByLabel("Compare current draft with");
  await expect(selector).toBeVisible();
  await selector.click();
  const menu = page.getByRole("listbox", {
    name: "Options",
  });
  await expect(
    menu.locator('[data-option-group="Saved versions"] [role="option"]'),
  ).toHaveCount(1);
  await expect(
    menu.locator('[data-option-group="Other CVs"] [role="option"]').filter({
      hasText: variant.metadata.title,
    }),
  ).toHaveCount(1);

  await selectMenu(selector, "revision:1");
  await dialog.getByRole("button", { name: "Show differences" }).click();
  await expect(
    dialog.getByText("Unsaved draft", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("No content", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    dialog.getByText("Revision 1 → Current draft", { exact: true }),
  ).toBeVisible();

  await selectMenu(selector, `resume:${variant.metadata.id}`);
  await expect(
    dialog.getByText("Revision 1 → Current draft", { exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Show differences" }).click();
  await expect(
    dialog.getByText(`${variant.metadata.title} → Current draft`, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Unsaved draft", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("No content", { exact: true }).first(),
  ).toBeVisible();

  await page.screenshot({ path: "test-results/version-compare-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/version-compare-mobile.png" });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("textbox", { name: "First Name", exact: true }),
  ).toHaveValue("Unsaved draft");
  const stored = await (
    await request.get(`${API}/resumes/${first.metadata.id}`)
  ).json();
  expect(stored.profile.firstName).toBe("Saved version");
});

test("comparison shows an empty result for an unchanged saved version", async ({
  page,
  request,
}) => {
  const response = await request.post(`${API}/resumes`, {
    data: { title: "Identical version", templateId: "technical" },
  });
  expect(response.ok()).toBeTruthy();
  const doc = await response.json();
  const saved = await request.put(`${API}/resumes/${doc.metadata.id}`, {
    data: { revision: 1, document: doc },
  });
  expect(saved.ok()).toBeTruthy();
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByLabel("Compare revisions and variants").click();
  const dialog = page.getByRole("dialog", { name: "Compare versions" });
  await selectMenu(
    dialog.getByLabel("Compare current draft with"),
    "revision:1",
  );
  await dialog.getByRole("button", { name: "Show differences" }).click();
  await expect(
    dialog.getByText("No differences found.", { exact: true }),
  ).toBeVisible();
});
