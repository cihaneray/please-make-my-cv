import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const language of ["en", "tr"] as const) {
  for (const list of ["resumes", "library"] as const) {
    test(`${language} ${list} keeps initial load failure after dismissal and retries the list`, async ({
      page,
    }) => {
      await page.addInitScript(
        (lang) => localStorage.setItem("cv_workspace_language", lang),
        language,
      );
      let failing = true;
      let listRequests = 0;
      let releaseList!: () => void;
      const hydrated = new Promise<void>((resolve) => {
        releaseList = resolve;
      });
      await page.route("**/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === `/api/${list}`) {
          listRequests++;
          await hydrated;
          return route.fulfill(
            failing
              ? { status: 503, json: { detail: "Fixture unavailable" } }
              : { json: [] },
          );
        }
        if (path === "/api/workspace/metrics") {
          return route.fulfill({ json: { atsAverage: null, resumeCount: 0 } });
        }
        return route.fulfill({ json: [] });
      });
      await page.goto(`/${list}`);
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await expect.poll(() => listRequests).toBe(1);
      releaseList();
      const message =
        list === "resumes"
          ? language === "tr"
            ? "Özgeçmişler yüklenemedi."
            : "Could not load resumes."
          : language === "tr"
            ? "Kütüphane yüklenemedi."
            : "Could not load the library.";
      const error = page.getByRole("alert").filter({ hasText: message });
      await expect(error).toContainText(message);
      await page
        .getByRole("button", {
          name: language === "tr" ? "Kapat" : "Dismiss",
          exact: true,
        })
        .click();
      await expect(error).toContainText(message);
      await expect(page.getByRole("status")).toHaveCount(0);
      const empty =
        list === "resumes"
          ? language === "tr"
            ? "Özgeçmiş bulunamadı"
            : "No resumes found"
          : language === "tr"
            ? "Kütüphaneniz henüz boş"
            : "Your library is empty";
      await expect(page.getByText(empty, { exact: false })).toHaveCount(0);
      if (list === "resumes") {
        await expect(page.locator(".resume-list-tabs button span")).toHaveText([
          "-",
          "-",
        ]);
      } else {
        await expect(
          page.locator(".library-metric-card .font-headline-lg").first(),
        ).toHaveText("-");
      }
      const beforeRetry = listRequests;
      failing = false;
      await error
        .getByRole("button", {
          name: language === "tr" ? "Tekrar dene" : "Try again",
          exact: true,
        })
        .click();
      await expect(error).toHaveCount(0);
      expect(listRequests).toBeGreaterThan(beforeRetry);
      await expect(page.getByText(empty, { exact: false })).toBeVisible();
      if (list === "resumes") {
        await expect(page.locator(".resume-list-tabs button span")).toHaveText([
          "0",
          "0",
        ]);
      } else {
        await expect(
          page.locator(".library-metric-card .font-headline-lg").first(),
        ).toHaveText("0");
      }
    });
  }

  test(`${language} source import guide stays readable at mobile widths`, async ({
    page,
  }) => {
    await page.addInitScript(
      (lang) => localStorage.setItem("cv_workspace_language", lang),
      language,
    );
    await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
    await page.goto("/import");
    const guide = page.getByText(
      language === "tr"
        ? "İçe aktarmadan önce düzenlenmiş A4 önizlemesini görmek için içerik yükleyin veya yapıştırın."
        : "Upload or paste content to see normalized A4 canvas preview before importing.",
      { exact: true },
    );
    for (const width of [390, 320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(guide).toBeVisible();
      const guideBox = (await guide.boundingBox())!;
      expect(guideBox.width).toBeGreaterThan(width <= 390 ? width - 70 : 400);
      if (width <= 390) {
        const input = (await page.locator("textarea").boundingBox())!;
        expect(guideBox.y).toBeGreaterThan(input.y + input.height);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });
}

test("mobile source import preserves a full-width parsed preview and Turkish structure labels", async ({
  page,
  request,
}) => {
  // Parse the shared valid fixture through the isolated test API without saving a CV.
  const content = readFileSync(
    resolve(
      __dirname,
      "../../../packages/shared/fixtures/software_engineer_resume.yaml",
    ),
    "utf8",
  );
  const result = await request.post(
    "http://127.0.0.1:8101/api/import/preview",
    { data: { content } },
  );
  expect(result.ok()).toBeTruthy();
  const parsed = await result.json();
  expect(parsed.previewDocument).toBeTruthy();
  await page.addInitScript(() =>
    localStorage.setItem("cv_workspace_language", "tr"),
  );
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/import/preview") return route.fulfill({ json: parsed });
    if (path.endsWith("/preview"))
      return route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><html><body>Preview fixture</body></html>",
      });
    return route.fulfill({ json: [] });
  });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/import");
  await page.locator("textarea").fill(content);
  await page
    .getByRole("button", { name: "Ayrıştır ve Önizleme Oluştur", exact: true })
    .click();
  await expect(
    page.getByText("Algılanan Özgeçmiş Yapısı", { exact: true }),
  ).toBeVisible();
  const preview = page.locator(".document-canvas");
  await expect(preview).toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const box = (await preview.boundingBox())!;
    expect(box.width).toBeGreaterThan(width - 70);
    expect(box.height).toBeGreaterThan(500);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
});
