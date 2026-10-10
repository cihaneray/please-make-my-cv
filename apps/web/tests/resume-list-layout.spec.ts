import { expect, test } from "@playwright/test";

const longTitle =
  "Principal Platform Engineer — International Systems and Developer Experience Portfolio";
const records = [
  {
    id: "layout-active",
    title: longTitle,
    targetRole: "Principal Platform Engineer",
    templateId: "modern",
    language: "en",
    targetMarket: "GLOBAL",
    revision: 12,
    updatedAt: "2026-10-09T12:00:00Z",
    createdAt: "2026-09-01T12:00:00Z",
    parentResumeId: null,
    isArchived: false,
    stats: {},
  },
  {
    id: "layout-archived",
    title: "Previous CV draft",
    targetRole: "Designer",
    templateId: "classic",
    language: "tr",
    targetMarket: "TR",
    revision: 3,
    updatedAt: "2026-10-08T12:00:00Z",
    createdAt: "2026-09-01T12:00:00Z",
    parentResumeId: null,
    isArchived: true,
    stats: {},
  },
];

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1280]) {
    test(`resume list is readable in ${theme} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("cv_workspace_theme", value),
        theme,
      );
      await page.route("**/api/resumes?include_archived=true", (route) =>
        route.fulfill({ json: records }),
      );
      await page.goto("/resumes");
      await expect(page.locator("html")).toHaveClass(
        theme === "dark" ? /dark/ : /^(?!.*dark)/,
      );
      const card = page
        .locator(".resume-list-card")
        .filter({ hasText: longTitle });
      await expect(card).toBeVisible();
      await expect(card.getByRole("link", { name: longTitle })).toHaveAttribute(
        "href",
        "/resumes/layout-active",
      );
      await expect(card.getByText("Template")).toBeVisible();
      await expect(card.getByText("GLOBAL")).toBeVisible();
      await expect(
        card.getByRole("button", { name: `Review CV: ${longTitle}` }),
      ).toBeVisible();
      await expect(
        card.getByRole("link", { name: "Download PDF" }),
      ).toBeVisible();
      await expect(
        card.getByRole("button", { name: `Delete CV: ${longTitle}` }),
      ).toBeVisible();
      expect(await card.getByRole("link", { name: longTitle }).count()).toBe(1);

      const bounds = await card.evaluate((element) => {
        const title = element
          .querySelector("a[href='/resumes/layout-active']")!
          .getBoundingClientRect();
        const meta = element.querySelector("dl")!.getBoundingClientRect();
        const actions = [
          ...element.querySelectorAll(".resume-card-actions > *"),
        ].map((node) => node.getBoundingClientRect());
        return {
          titleBottom: title.bottom,
          metaTop: meta.top,
          actions: actions.map((r) => ({
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
          })),
        };
      });
      expect(bounds.metaTop).toBeGreaterThan(bounds.titleBottom);
      for (const action of bounds.actions) {
        expect(action.width).toBeGreaterThanOrEqual(44);
        expect(action.height).toBeGreaterThanOrEqual(44);
      }
      for (let i = 0; i < bounds.actions.length; i++) {
        for (let j = i + 1; j < bounds.actions.length; j++) {
          const a = bounds.actions[i],
            b = bounds.actions[j];
          expect(
            a.right <= b.left ||
              b.right <= a.left ||
              a.bottom <= b.top ||
              b.bottom <= a.top,
          ).toBe(true);
        }
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);

      await page.screenshot({
        path: `test-results/resume-list-${theme}-${width}.png`,
      });
      await page.getByRole("button", { name: /^Deleted documents/ }).click();
      const archived = page
        .locator(".resume-list-card")
        .filter({ hasText: "Previous CV draft" });
      await expect(
        archived.getByRole("button", { name: "Restore" }),
      ).toBeVisible();
      await expect(
        archived.getByRole("button", {
          name: "Delete permanently: Previous CV draft",
        }),
      ).toBeVisible();
      await expect(
        archived.getByRole("button", { name: /Review CV/ }),
      ).toHaveCount(0);
    });
  }
}
