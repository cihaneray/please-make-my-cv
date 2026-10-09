import { test, expect } from "@playwright/test";

test("CV deletion requires confirmation, handles errors, supports restore and permanent removal", async ({
  page,
  request,
}) => {
  const response = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "Deletion QA document" },
  });
  const doc = await response.json();
  const endpoint = `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/resumes");
  const card = page
    .locator(".resume-list-card")
    .filter({ hasText: "Deletion QA document" });
  const open = () =>
    card
      .getByRole("button", {
        name: "Delete CV: Deletion QA document",
        exact: true,
      })
      .click();
  await open();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect((await (await request.get(endpoint)).json()).metadata.isArchived).toBe(
    false,
  );

  await page.route(`**/api/resumes/${doc.metadata.id}*`, async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Deletion unavailable" }),
      });
    } else await route.continue();
  });
  await open();
  await dialog
    .getByRole("button", { name: "Move to deleted documents", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Deletion unavailable");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(card).toBeVisible();
  await page.unroute(`**/api/resumes/${doc.metadata.id}*`);

  await open();
  await dialog
    .getByRole("button", { name: "Move to deleted documents", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: /^Deleted documents/ }).click();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: /^Active CVs/ }).click();
  await expect(card).toBeVisible();
  expect((await (await request.get(endpoint)).json()).metadata.isArchived).toBe(
    false,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const actions = await card.locator(".resume-card-actions").boundingBox();
  const button = await card.locator(".resume-card-delete").boundingBox();
  expect(button!.height).toBeGreaterThanOrEqual(44);
  expect(button!.y).toBeGreaterThanOrEqual(actions!.y);

  await open();
  await dialog
    .getByRole("button", { name: "Move to deleted documents", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: /^Deleted documents/ }).click();
  await card
    .getByRole("button", {
      name: "Delete permanently: Deletion QA document",
      exact: true,
    })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Delete CV permanently?" }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  expect((await request.get(endpoint)).status()).toBe(404);
});
