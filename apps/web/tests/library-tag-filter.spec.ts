import { expect, test } from "@playwright/test";

test("many tags stay compact and can be searched, selected and reset on mobile", async ({ page }) => {
  const snippets = Array.from({ length: 40 }, (_, index) => ({
    id: `snippet-${index}`, title: `Achievement ${index}`, content: `Evidence ${index}`,
    category: "General", tags: [index === 0 ? "Python" : `Technology ${index}`],
    variants: [], targetRoles: [], metrics: "", type: "bullet",
  }));
  await page.route("**/api/library?*", route => route.fulfill({ json: snippets }));
  await page.route("**/api/workspace/metrics", route => route.fulfill({ json: { atsAverage: 80, resumeCount: 1 } }));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/library");
  const toolbar = page.getByRole("region", { name: "Search and filter snippets" });
  const trigger = toolbar.getByRole("button", { name: /^Tag:/ });
  await expect(trigger).toBeVisible();
  await expect(toolbar.getByRole("button", { name: /Technology/ })).toHaveCount(0);
  await trigger.click();
  const search = page.getByRole("searchbox", { name: "Search tags" });
  await expect(search).toBeFocused();
  await search.fill("python");
  await page.getByRole("button", { name: /^Python/ }).click();
  await expect(trigger).toContainText("Python");
  await expect(page.locator(".library-snippet-card")).toHaveCount(1);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await search.press("Escape");
  await expect(search).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("button", { name: "Reset to all tags" }).click();
  await expect(page.locator(".library-snippet-card")).toHaveCount(40);
  await trigger.click();
  await page.getByRole("heading", { name: "Career Library", exact: true }).click();
  await expect(search).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/library-tags-mobile.png", fullPage: false });
});
