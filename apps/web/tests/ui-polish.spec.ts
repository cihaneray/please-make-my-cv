import { test, expect } from "@playwright/test";

test("list controls are unique and URL navigation filters documents", async ({
  page,
  request,
}) => {
  const response = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "Polish search example" },
  });
  const doc = await response.json();
  await page.goto("/resumes?q=Polish%20search%20example");
  await expect(page.getByRole("searchbox")).toHaveCount(1);
  await expect(page.locator(".header-create")).toHaveCount(0);
  const card = page
    .locator(".resume-list-card")
    .filter({ hasText: "Polish search example" });
  await expect(card).toBeVisible();
  await expect(
    card
      .locator("dl > div")
      .filter({ has: page.locator("dt", { hasText: "CV language" }) })
      .locator("dd"),
  ).toHaveText("EN");
  await expect(
    card
      .locator("dl > div")
      .filter({ has: page.locator("dt", { hasText: "Market" }) })
      .locator("dd"),
  ).toHaveText("TR");
  await page.evaluate(() =>
    window.history.pushState(null, "", "/resumes?q=NO_MATCH_POLISH"),
  );
  await expect(page.getByRole("searchbox")).toHaveValue("NO_MATCH_POLISH");
  await expect(page.locator(".resume-list-card")).toHaveCount(0);
  await page.goto("/settings");
  await page
    .getByRole("searchbox", { name: "Search resumes" })
    .fill("NO_MATCH_POLISH");
  await page.getByRole("searchbox", { name: "Search resumes" }).press("Enter");
  await expect(page.getByRole("searchbox")).toHaveValue("NO_MATCH_POLISH");
  await expect(page.locator(".resume-list-card")).toHaveCount(0);
  await page.goBack();
  await page.goto(`/resumes/${doc.metadata.id}`);
  await expect(page.locator(".inspector-heading")).toContainText(
    "Editing panel",
  );
  await expect(
    page.locator('.studio-outline button[data-empty="true"]').first(),
  ).toContainText("Add");
  for (const button of await page.locator(".studio-outline button").all()) {
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test("settings guard passwords and show only relevant LLM actions", async ({
  page,
}) => {
  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({
      json: {
        enabled: false,
        provider: "ollama",
        model: "",
        baseUrl: "http://localhost:11434",
        hasApiKey: false,
      },
    }),
  );
  await page.goto("/settings");
  await expect(page.getByLabel("Remove stored key")).toHaveCount(0);
  await page.getByLabel("Enable AI reviews").check();
  await expect(
    page.getByRole("button", { name: "Save connection", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Enter a model ID to enable AI reviews."),
  ).toBeVisible();
  await page.getByLabel("Model ID").fill("local-model");
  await expect(
    page.getByRole("button", { name: "Save connection", exact: true }),
  ).toBeEnabled();
  const password = page.getByLabel("Backup password (at least 12 characters)");
  await password.fill("a-long-test-password");
  const download = page.getByRole("button", {
    name: "Download workspace backup",
  });
  await expect(download).toBeDisabled();
  await page
    .getByLabel("Confirm backup password")
    .fill("a-wrong-test-password");
  await expect(page.getByText("Passwords do not match.")).toBeVisible();
  await expect(download).toBeDisabled();
  await page.getByLabel("Confirm backup password").fill("a-long-test-password");
  await expect(download).toBeEnabled();
  await page
    .locator(".backup-export")
    .getByRole("button", { name: "Show password" })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["Light", "Dark"]) {
      await page.getByRole("radio", { name: theme, exact: true }).check();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  }
  await page
    .locator(".workspace-backup")
    .screenshot({ path: "test-results/backup-polish-dark.png" });
});
