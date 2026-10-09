import { test, expect } from "@playwright/test";

test("settings sections remain readable, navigate and preserve language and theme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");
  const nav = page.getByRole("navigation", {
    name: "Settings sections",
    exact: true,
  });
  await nav
    .getByRole("link", { name: "Language & Region", exact: true })
    .click();
  await page
    .locator("#language")
    .getByRole("button", { name: /Türkçe/ })
    .click();
  await expect(
    page.locator('#language button[aria-pressed="true"]'),
  ).toContainText("Türkçe");
  await page
    .getByRole("navigation", { name: "Ayar bölümleri", exact: true })
    .getByRole("link", { name: "Arayüz ve Tema", exact: true })
    .click();
  await page.getByRole("radio", { name: "Koyu", exact: true }).check();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page
    .locator(".settings-layout")
    .screenshot({ path: "test-results/settings-layout-dark.png" });
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Koyu", exact: true }),
  ).toBeChecked();
  await expect(
    page.locator('#language button[aria-pressed="true"]'),
  ).toContainText("Türkçe");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["Açık", "Koyu"]) {
      await page.getByRole("radio", { name: theme, exact: true }).check();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      const choices = page.locator(".settings-theme-option");
      for (let i = 0; i < 3; i++) {
        const bounds = await choices.nth(i).boundingBox();
        expect(bounds!.width).toBeGreaterThan(70);
        expect(bounds!.height).toBeGreaterThan(44);
      }
      await page
        .locator(".settings-theme-options")
        .screenshot({ path: `test-results/theme-${theme}-${width}.png` });
    }
  }
});
