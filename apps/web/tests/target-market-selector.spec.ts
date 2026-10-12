import { test, expect } from "@playwright/test";

test("target market popup fits the viewport and saves keyboard selections", async ({ page, request }) => {
  const base = "http://127.0.0.1:8101/api";
  const document = await (await request.post(`${base}/resumes`, { data: { title: "Market selector QA" } })).json();
  await page.goto(`/resumes/${document.metadata.id}`);
  await page.getByRole("button", { name: "Design", exact: true }).click();
  const trigger = page.getByRole("combobox", { name: "Target Market", exact: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 720 });
    await page.emulateMedia({ colorScheme: "dark" });
    await trigger.click();
    const popup = page.getByRole("listbox", { name: "Options", exact: true });
    await expect(popup).toBeVisible();
    const box = (await popup.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(720);
    await page.screenshot({ path: `test-results/market-selector-${width}.png` });
    await trigger.press("Escape");
    await expect(popup).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await trigger.press("ArrowDown");
  await trigger.press("End");
  await trigger.press("Enter");
  await expect(trigger).toContainText("Other Market");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect.poll(async () => (await (await request.get(`${base}/resumes/${document.metadata.id}`)).json()).metadata.targetMarket).toBe("OTHER");
});
