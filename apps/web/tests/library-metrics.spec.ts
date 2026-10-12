import { expect, test } from "@playwright/test";

test("empty library identifies the CV-based score and distinguishes no assessment", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/library?*", route => route.fulfill({ json: [] }));
  let metrics: { atsAverage: number | null; resumeCount: number } = { atsAverage: 100, resumeCount: 1 };
  await page.route("**/api/workspace/metrics", route => route.fulfill({ json: metrics }));
  await page.goto("/library");
  await expect(page.getByText("Saved CV ATS average", { exact: true })).toBeVisible();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  const explanation = page.getByText("Calculated from saved CVs, independently of your snippets.", { exact: false });
  await expect(explanation).not.toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: "dark" });
    const heading = page.getByRole("heading", { name: "Career Library", exact: true });
    const before = await heading.boundingBox();
    const headerBefore = await page.locator(".library-header").boundingBox();
    const summary = page.locator(".library-ats-info summary");
    await summary.click();
    await expect(explanation).toBeVisible();
    expect((await heading.boundingBox())!.y).toBe(before!.y);
    expect((await page.locator(".library-header").boundingBox())!.height).toBe(headerBefore!.height);
    const panel = (await explanation.boundingBox())!;
    const metricCard = (await page.locator(".library-metric-card").boundingBox())!;
    expect(panel.y).toBeGreaterThanOrEqual(metricCard.y + metricCard.height);
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/library-ats-help-${width}.png` });
    await summary.press("Escape");
    await expect(explanation).not.toBeVisible();
    await expect(summary).toBeFocused();
    await summary.click();
    await heading.click();
    await expect(explanation).not.toBeVisible();
  }
  await expect(page.getByText("Your library is empty.", { exact: false })).toBeVisible();
  metrics = { atsAverage: null, resumeCount: 0 };
  await page.reload();
  await expect(page.getByText("Not assessed", { exact: true })).toBeVisible();
  await expect(page.getByText("100%", { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
