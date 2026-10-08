import { test, expect } from "@playwright/test";

test("Turkish AI review form keeps fields spaced and explains provider quota errors", async ({
  page,
  request,
}) => {
  const response = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "AI review layout QA" },
  });
  const doc = await response.json();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        provider: "gemini",
        model: "gemini-test",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        hasApiKey: true,
      },
    }),
  );
  await page.route("**/api/ai/review", (route) =>
    route.fulfill({
      status: 502,
      json: {
        error: {
          code: "AI_PROVIDER_ERROR",
          message:
            "Model server returned HTTP 429. The provider request limit or quota was reached.",
        },
      },
    }),
  );
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Türkçeye geç", exact: true }).click();
  await page.getByRole("button", { name: "İnceleme", exact: true }).click();
  const panel = page.getByRole("region", { name: "AI resume review" });
  await panel.getByText("İlana özel CV kopyası", { exact: true }).click();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const input = panel.getByLabel("Hedef pozisyon", { exact: true });
    await input.click();
    const geometry = await input.evaluate((element) => ({
      offset: getComputedStyle(element).outlineOffset,
      gap:
        element.getBoundingClientRect().top -
        element.closest("label")!.querySelector("span")!.getBoundingClientRect()
          .bottom,
    }));
    expect(geometry.offset).toBe("-2px");
    expect(geometry.gap).toBeGreaterThanOrEqual(8);
    expect(
      await panel.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
  }
  await panel
    .getByRole("button", { name: "Taslağı yapay zeka ile incele", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText(
    "istek sınırına veya kotasına ulaşıldı",
  );
  await expect(panel.getByRole("alert")).not.toContainText("JSON-mode");
  await expect(
    panel.getByRole("button", {
      name: "Taslağı yapay zeka ile incele",
      exact: true,
    }),
  ).toBeEnabled();
  const primary = panel.getByRole("button", {
    name: "Taslağı yapay zeka ile incele",
    exact: true,
  });
  await primary.hover();
  const contrast = await primary.evaluate((element) => {
    const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const foreground = rgb(getComputedStyle(element).color);
    const background = rgb(getComputedStyle(element).backgroundColor);
    const surface = rgb(
      getComputedStyle(element.closest(".ai-review")!).backgroundColor,
    );
    const alpha = background[3] ?? 1;
    const luminance = (values: number[]) =>
      values
        .slice(0, 3)
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        })
        .reduce(
          (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
          0,
        );
    const a = luminance(foreground);
    const b = luminance(
      background
        .slice(0, 3)
        .map((value, index) => value * alpha + surface[index] * (1 - alpha)),
    );
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
