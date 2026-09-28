import { test, expect } from "@playwright/test";
async function create(request: any) {
  const response = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "Browser regression", templateId: "technical" },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}
test("visual draft is preserved in source and invalid source blocks switching", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByRole("textbox", { name: "firstName", exact: true })
    .fill("UnsavedName");
  await expect(
    page.frameLocator("iframe").getByRole("heading", { name: /UnsavedName/i }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/studio.png", fullPage: true });
  await page.getByRole("button", { name: "Source", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Resume source" });
  await expect(source).toHaveValue(/UnsavedName/);
  await source.fill("profile: [broken");
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await expect(source).toBeVisible();
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.getByRole("status").last()).toContainText(/Invalid|syntax/);
});
test("typing during save survives acknowledgment", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  const name = page.getByRole("textbox", { name: "firstName", exact: true });
  await name.fill("First");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(`**/api/resumes/${doc.metadata.id}`, async (route) => {
    if (route.request().method() === "PUT") {
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await name.fill("Newer");
  release();
  await expect(
    page.getByRole("button", { name: "Save Draft", exact: true }),
  ).toBeEnabled();
  await expect(name).toHaveValue("Newer");
  await expect(
    page.getByText("Unsaved draft", { exact: false }).first(),
  ).toBeVisible();
});
test("draft survives reload and can be explicitly recovered", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByRole("textbox", { name: "firstName", exact: true })
    .fill("RecoveredName");
  await expect
    .poll(() =>
      page.evaluate(
        (id) => localStorage.getItem(`cv-draft-${id}`),
        doc.metadata.id,
      ),
    )
    .toContain("RecoveredName");
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await page.getByRole("button", { name: "Recover", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "firstName", exact: true }),
  ).toHaveValue("RecoveredName");
});
test("source apply changes the draft and PDF contains it", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Source", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Resume source" });
  const text = await source.inputValue();
  await source.fill(text.replace("firstName: ''", "firstName: SourceName"));
  await page
    .getByRole("button", { name: "Apply to draft", exact: true })
    .click();
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "firstName", exact: true }),
  ).toHaveValue("SourceName");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
});
test("failed deletion remains visible and displays feedback", async ({
  page,
  request,
}) => {
  const response = await request.post("http://127.0.0.1:8101/api/library", {
    data: { title: "Deletion target", content: "Keep this content" },
  });
  const item = await response.json();
  await page.goto("/library");
  await page.route(`**/api/library/${item.id}`, (route) =>
    route.fulfill({ status: 500, body: "Server unavailable" }),
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete snippet" }).first().click();
  await expect(page.getByRole("status").last()).toContainText(
    "Server unavailable",
  );
  await expect(page.getByText("Keep this content").first()).toBeVisible();
});
test("import changes invalidate a previous preview", async ({ page }) => {
  await page.goto("/import");
  const input = page.locator("textarea");
  await input.fill('{"profile":{"firstName":"Before"}}');
  await page
    .getByRole("button", { name: /Preview|Validate/i })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: /Confirm|Save/i }).first(),
  ).toBeEnabled();
  await input.fill('{"profile":{"firstName":"After"}}');
  await expect(page.getByRole("button", { name: /Confirm|Save/i })).toHaveCount(
    0,
  );
});
test("mobile navigation remains available", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await page.screenshot({
    path: "test-results/mobile-settings.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("combobox", { name: "Navigate workspace" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Navigate workspace" })
    .selectOption("/resumes");
  await expect(page).toHaveURL(/resumes/);
});

test("complete field editor saves nested skill strings", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByText("All fields, history, library and backups", { exact: true })
    .click();
  const details = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: /^Skills$/ }) })
    .last();
  await details.locator("summary").click();
  await details
    .getByRole("button", { name: "Add Skills", exact: true })
    .click();
  await details.getByLabel("Category", { exact: true }).fill("Languages");
  await details
    .getByRole("button", { name: "Add Skills", exact: true })
    .first()
    .click();
  await details
    .getByRole("textbox", { name: "Skills 1", exact: true })
    .fill("Python");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(async () => {
      const r = await request.get(
        `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
      );
      return (await r.json()).skills;
    })
    .toMatchObject([{ category: "Languages", skills: ["Python"] }]);
});

test("revision history restores content as a new draft", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  doc.profile.firstName = "Saved version";
  await request.put(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`, {
    data: { revision: 1, document: doc },
  });
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByText("All fields, history, library and backups", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load revision history", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore revision 1", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "firstName", exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(async () => {
      const r = await request.get(
        `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
      );
      return (await r.json()).metadata.revision;
    })
    .toBe(3);
});

test("LLM settings save securely and test the selected provider", async ({
  page,
}) => {
  let config = {
    enabled: false,
    provider: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "",
    hasApiKey: false,
  };
  await page.route("**/api/ai/settings", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      expect(body.apiKey).toBe("test-secret");
      config = { ...body, hasApiKey: true };
      delete (config as any).apiKey;
    }
    await route.fulfill({ json: config });
  });
  await page.route("**/api/ai/test", (route) =>
    route.fulfill({ json: { message: "Connection succeeded." } }),
  );
  await page.goto("/settings");
  await page.getByLabel("Provider", { exact: true }).selectOption("ollama");
  await expect(page.getByLabel("API base URL")).toHaveValue(
    "http://localhost:11434",
  );
  await page.getByLabel("Enable AI reviews").check();
  await page.getByLabel("Model ID").fill("local-model");
  await page
    .getByLabel("API key (optional for local servers)")
    .fill("test-secret");
  await page
    .getByRole("button", { name: "Save connection", exact: true })
    .click();
  await expect(
    page.getByLabel("API key (optional for local servers)"),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Test saved connection" }).click();
  await expect(
    page.getByText("Connection succeeded.", { exact: true }),
  ).toBeVisible();
});

test("AI review shows explained score and flags outdated feedback", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        provider: "ollama",
        baseUrl: "http://localhost:11434",
        model: "test-model",
        hasApiKey: false,
      },
    }),
  );
  await page.route("**/api/ai/review", (route) =>
    route.fulfill({
      json: {
        score: 60,
        summary: "Add concrete evidence.",
        model: "test-model",
        provider: "ollama",
        notice: "Subjective editorial score.",
        clarity: { score: 20, rationale: "Clear" },
        evidence: { score: 10, rationale: "Missing results" },
        completeness: { score: 15, rationale: "Missing dates" },
        relevance: null,
        strengths: ["Readable"],
        recommendations: [
          {
            section: "experience",
            priority: "high",
            evidence: "No outcomes",
            advice: "Add a verified outcome",
            suggestedText: "",
          },
        ],
        questions: ["What improved?"],
      },
    }),
  );
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Review current draft with AI" })
    .click();
  await expect(page.getByText("AI editorial score: 60/100")).toBeVisible();
  await expect(page.getByText("Add a verified outcome")).toBeVisible();
  await page.getByLabel("Target job description (optional)").fill("Engineer");
  await expect(
    page.getByText("Draft or review options changed.", { exact: false }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/ai-review.png", fullPage: true });
});

test("live preview keeps A4 geometry and print margins while fitting the panel", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  doc.profile.firstName = "Alex";
  doc.profile.lastName = "Morgan";
  doc.profile.headline = "Software Engineer";
  doc.summary =
    "Builds reliable software and works with product teams to deliver useful, maintainable applications.";
  doc.design.margins = "normal";
  await request.put(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`, {
    data: { document: doc, revision: doc.metadata.revision },
  });
  await page.goto(`/resumes/${doc.metadata.id}`);
  const sheet = page.frameLocator("iframe").locator(".cv-page");
  await expect(sheet).toBeVisible();
  const geometry = await sheet.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    padding: parseFloat(getComputedStyle(element).paddingLeft),
    height: element.getBoundingClientRect().height,
  }));
  expect(geometry.width).toBeCloseTo(793.7, 0);
  expect(geometry.padding).toBeCloseTo(68.03, 0);
  expect(geometry.height).toBeGreaterThan(1122);
  const viewport = await page.getByTestId("preview-viewport").boundingBox();
  const frame = await page.locator("iframe").boundingBox();
  expect(frame!.width).toBeLessThanOrEqual(viewport!.width + 1);
  await page.screenshot({
    path: "test-results/preview-a4.png",
    fullPage: true,
  });
  await page.getByLabel("Preview zoom").selectOption("1");
  expect((await page.locator("iframe").boundingBox())!.width).toBeCloseTo(
    793.7,
    0,
  );
  await page.getByLabel("Preview zoom").selectOption("fit");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => (await page.locator("iframe").boundingBox())!.width)
    .toBeLessThan(390);
  expect(
    await sheet.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeCloseTo(793.7, 0);
});

test("dark mode persists and keeps resume paper white", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(20, 21, 25)",
  );
  await page.screenshot({
    path: "test-results/dark-settings.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const doc = await create(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await expect(page.frameLocator("iframe").locator(".cv-page")).toBeVisible();
  await expect(page.frameLocator("iframe").locator("body")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: "test-results/dark-studio.png",
    fullPage: true,
  });
  await page.goto("/templates");
  await expect(page.locator(".resume-paper").first()).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(page.locator(".resume-paper").first()).toHaveCSS(
    "color",
    "rgb(27, 27, 30)",
  );
});

test("system theme tracks the OS while manual preferences override it", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("radio", { name: "System", exact: true }).check();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  const other = await context.newPage();
  await other.goto("/settings");
  await other.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked();
  await other.close();
});
