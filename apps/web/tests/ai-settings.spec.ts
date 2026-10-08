import { test, expect } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`LLM fields keep their focus ring inside at ${width}px in both themes`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/ai/settings", (route) =>
      route.fulfill({
        json: {
          enabled: true,
          provider: "gemini",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
          model: "models/gemini-test",
          hasApiKey: true,
        },
      }),
    );
    await page.goto("/settings");
    for (const theme of ["Light", "Dark"]) {
      await page.getByRole("radio", { name: theme, exact: true }).check();
      const form = page.getByRole("region", {
        name: "LLM connection settings",
      });
      for (const name of ["Model ID", "API base URL", "Gemini API key"]) {
        const input = form.getByLabel(name, { exact: true });
        await input.click();
        await expect(input).toBeFocused();
        const geometry = await input.evaluate((element) => {
          const control = element.getBoundingClientRect();
          const label = element
            .closest("label")!
            .querySelector("span")!
            .getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            gap: control.top - label.bottom,
            offset: parseFloat(style.outlineOffset),
            outline: parseFloat(style.outlineWidth),
          };
        });
        expect(geometry.gap).toBeGreaterThanOrEqual(8);
        expect(geometry.outline).toBeGreaterThanOrEqual(2);
        expect(geometry.offset).toBeLessThanOrEqual(-geometry.outline);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await expect(form.getByLabel("Gemini API key")).toHaveValue("");
    }
  });
}

test("saved connection testing locks settings until the request finishes", async ({
  page,
}) => {
  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        provider: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        model: "models/gemini-test",
        hasApiKey: true,
      },
    }),
  );
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/ai/test", async (route) => {
    await pending;
    await route.fulfill({
      json: {
        ok: true,
        message: "Connection succeeded and the model returned JSON.",
      },
    });
  });
  await page.goto("/settings");
  await page.getByRole("button", { name: "Test saved connection" }).click();
  try {
    await expect(page.getByLabel("Model ID")).toBeDisabled();
    await expect(page.getByLabel("Provider", { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Save connection", exact: true }),
    ).toBeDisabled();
  } finally {
    finish();
  }
  await expect(page.getByLabel("Model ID")).toBeEnabled();
  await expect(
    page.getByText("Connection succeeded and the model returned JSON.", {
      exact: true,
    }),
  ).toBeVisible();
});
