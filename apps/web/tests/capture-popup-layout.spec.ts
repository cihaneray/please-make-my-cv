import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve(process.cwd(), "../../extensions/job-capture");
const html = readFileSync(resolve(directory, "popup.html"), "utf8");
const css = readFileSync(resolve(directory, "popup.css"), "utf8");
const script = readFileSync(resolve(directory, "popup.js"), "utf8");

test("popup shows incomplete extraction, requires corrected fields and keeps focus inside in both themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 840 });
  await page.addInitScript(() =>
    Object.assign(window, {
      chrome: {
        tabs: {
          query: async () => [
            { id: 1, url: "https://www.linkedin.com/jobs/view/12345/" },
          ],
        },
        scripting: {
          executeScript: async () => [
            {
              result: {
                company: "",
                position: "Backend Engineer",
                description: "Build APIs.\n• Python",
                sourceUrl: "https://www.linkedin.com/jobs/view/12345/",
                sourceType: "linkedin",
                missingFields: ["company"],
              },
            },
          ],
        },
      },
    }),
  );
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("about:blank");
    await page.setContent(
      html
        .replace('<script src="popup.js"></script>', "")
        .replace('<link rel="stylesheet" href="popup.css" />', ""),
    );
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: script });
    const send = page.getByRole("button", { name: "Send to App", exact: true });
    await expect(send).toBeDisabled();
    await page
      .getByRole("button", { name: "Capture Page", exact: true })
      .click();
    await expect(send).toBeDisabled();
    await expect(page.locator("#status")).not.toHaveClass(/hidden/);
    const company = page.getByLabel("Company *", { exact: true });
    await company.fill("Example Company");
    await expect(send).toBeEnabled();
    await expect(page.locator("#status")).toContainText("Details are ready.");
    await expect(company).toBeFocused();
    await expect(company).toHaveCSS("outline-offset", "-2px");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: `test-results/capture-popup-${theme}.png`,
      animations: "disabled",
    });
    await company.fill("");
    await expect(send).toBeDisabled();
  }
});
