import { test, expect } from "@playwright/test";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1cAAAAASUVORK5CYII=",
  "base64",
);
test("optional photo uploads, previews, persists, hides and removes without changing text", async ({
  page,
  request,
}) => {
  const doc = await (
    await request.post("http://127.0.0.1:8101/api/resumes", {
      data: { title: "Optional photo QA" },
    })
  ).json();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/resumes/${doc.metadata.id}`);
  const upload = page.getByLabel("Choose CV photo", { exact: true });
  await upload.setInputFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(
    page.getByRole("img", { name: "Selected CV photo", exact: true }),
  ).toBeVisible();
  const photo = page
    .frameLocator('iframe[title="Resume document preview"]')
    .locator("img.profile-photo");
  await expect(photo).toBeVisible();
  await expect
    .poll(() =>
      photo.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth === 320,
      ),
    )
    .toBe(true);
  await page
    .locator(".profile-photo-editor")
    .screenshot({ path: "test-results/photo-editor.png" });
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Draft", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Selected CV photo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Show photo on CV", exact: true })
    .uncheck();
  await expect(photo).toHaveCount(0);
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(
              `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
            )
          ).json()
        ).visibility.showPhoto,
    )
    .toBe(false);
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Show photo on CV", exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("checkbox", { name: "Show photo on CV", exact: true })
    .check();
  await upload.setInputFiles({
    name: "invalid.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(
    page.locator(".profile-photo-editor").getByRole("alert"),
  ).toContainText("Choose a PNG");
  await expect(
    page.getByRole("img", { name: "Selected CV photo", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Selected CV photo", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(
              `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
            )
          ).json()
        ).profile.photo,
    )
    .toBe("");
  const saved = await (
    await request.get(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`)
  ).json();
  expect(saved.profile.firstName).toBe(doc.profile.firstName);
  await request.delete(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`);
});
