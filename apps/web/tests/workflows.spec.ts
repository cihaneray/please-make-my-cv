import { test, expect } from "@playwright/test";
import { applyAIEdit } from "../src/lib/ai-edits";

test("job draft survives status changes and reload without reverting status on save", async ({
  page,
  request,
}) => {
  const response = await request.post("http://127.0.0.1:8101/api/jobs", {
    data: { company: "Draft preservation test", position: "Developer" },
  });
  const job = await response.json();
  await page.goto("/jobs");
  await page
    .getByText("Draft preservation test", { exact: true })
    .first()
    .click();
  await page
    .getByText("Edit job, requirements and submitted copies", { exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("Unsaved meeting note");
  await page
    .getByRole("combobox", { name: "Application status" })
    .selectOption("interview");
  await expect(
    page.getByRole("textbox", { name: "Notes", exact: true }),
  ).toHaveValue("Unsaved meeting note");
  await page.reload();
  await page
    .getByText("Edit job, requirements and submitted copies", { exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Notes", exact: true }),
  ).toHaveValue("Unsaved meeting note");
  await page.getByRole("button", { name: "Save job", exact: true }).click();
  await expect
    .poll(async () =>
      (await request.get(`http://127.0.0.1:8101/api/jobs/${job.id}`)).json(),
    )
    .toMatchObject({ status: "interview", notes: "Unsaved meeting note" });
  await expect(
    page.getByRole("region", { name: "Application timeline" }),
  ).toContainText("interview");
});

test("dates store separate fields and additional CV sections are discoverable", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Work Experience 0" }).click();
  await page.getByRole("button", { name: "Add Role" }).click();
  await page
    .getByRole("textbox", { name: "Start date", exact: true })
    .fill("2022-03");
  await page.getByRole("checkbox", { name: "Present", exact: true }).check();
  await expect(
    page.getByRole("textbox", { name: "End date", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(async () =>
      (
        await request.get(
          `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
        )
      ).json(),
    )
    .toMatchObject({
      experience: [{ startDate: "2022-03", endDate: "", current: true }],
    });
  await page.getByRole("button", { name: "Certifications 0" }).click();
  await expect(
    page.getByRole("button", { name: "Add Certifications", exact: true }),
  ).toBeVisible();
});

test("revision comparison and PDF checks use the current draft", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  doc.summary = "Baseline summary";
  await request.put(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`, {
    data: { revision: 1, document: doc },
  });
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByRole("textbox", { name: "First Name", exact: true })
    .fill("Draft difference");
  await page
    .getByText("Compare revisions and variants", { exact: true })
    .click();
  await page.getByRole("button", { name: "Load comparison choices" }).click();
  await page
    .getByLabel("Compare current draft with")
    .selectOption("revision:1");
  await page.getByRole("button", { name: "Show differences" }).click();
  await expect(
    page.getByText("Draft difference", { exact: true }).last(),
  ).toBeVisible();
  await expect(
    page.getByText("Comparison does not change your document.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check PDF output", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Resume preview" }),
  ).toContainText("Pages: 1");
  await page.screenshot({
    path: "test-results/new-features.png",
    fullPage: true,
  });
  expect(
    (
      await (
        await request.get(
          `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
        )
      ).json()
    ).profile.firstName,
  ).toBe("");
});

test("library metric is calculated and new snippets do not invent variants", async ({
  page,
  request,
}) => {
  const metrics = await (
    await request.get("http://127.0.0.1:8101/api/workspace/metrics")
  ).json();
  await page.goto("/library");
  await expect(
    page.getByText("ATS heuristic average", { exact: true }),
  ).toBeVisible();
  if (metrics.atsAverage !== null)
    await expect(
      page.getByText(`${metrics.atsAverage}%`, { exact: true }),
    ).toBeVisible();
  await page.getByRole("button", { name: "Add Snippet", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Snippet title", exact: true })
    .fill("Real library entry");
  await page
    .getByRole("textbox", { name: "Achievement", exact: true })
    .fill("Reduced latency 35%");
  await page
    .getByRole("textbox", { name: "Tags", exact: true })
    .fill("CustomTag");
  await page.getByRole("button", { name: "Save Snippet", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "CustomTag", exact: true }),
  ).toBeVisible();
  const snippets = await (
    await request.get("http://127.0.0.1:8101/api/library")
  ).json();
  expect(
    snippets.find((s: any) => s.title === "Real library entry"),
  ).toMatchObject({ category: "General", variants: [] });
});

test("mobile editor separates content and preview without horizontal overflow", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/resumes/${doc.metadata.id}`);
  await expect(
    page.getByRole("textbox", { name: "First Name", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Resume preview" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Resume preview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "First Name", exact: true }),
  ).toBeHidden();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/mobile-preview.png",
    fullPage: true,
  });
});

test("saved job requirements survive reload", async ({ page, request }) => {
  const response = await request.post("http://127.0.0.1:8101/api/jobs", {
    data: { company: "Requirements regression", position: "Chef" },
  });
  expect(response.ok()).toBeTruthy();
  const job = await response.json();
  await page.goto("/jobs");
  await page
    .getByText("Requirements regression", { exact: true })
    .first()
    .click();
  await page
    .getByText("Edit job, requirements and submitted copies", { exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Requirements to compare (one per line)" })
    .fill("cake decorating\nfood safety");
  await page.getByRole("button", { name: "Save job", exact: true }).click();
  await expect
    .poll(async () =>
      (await request.get(`http://127.0.0.1:8101/api/jobs/${job.id}`)).json(),
    )
    .toMatchObject({ requirements: ["cake decorating", "food safety"] });
  await page.reload();
  await page
    .getByText("Edit job, requirements and submitted copies", { exact: true })
    .click();
  await expect(
    page.getByRole("textbox", {
      name: "Requirements to compare (one per line)",
    }),
  ).toHaveValue("cake decorating\nfood safety");
});
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
    .getByRole("textbox", { name: "First Name", exact: true })
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
  const name = page.getByRole("textbox", { name: "First Name", exact: true });
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
    .getByRole("textbox", { name: "First Name", exact: true })
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
    page.getByRole("textbox", { name: "First Name", exact: true }),
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
    page.getByRole("textbox", { name: "First Name", exact: true }),
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
    page.getByRole("textbox", { name: "First Name", exact: true }),
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
  await page.getByRole("button", { name: "Preview", exact: true }).click();
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

function coachingResult(documentId: string) {
  return {
    score: 60,
    summary: "Clarify your summary.",
    model: "test-model",
    provider: "ollama",
    notice: "Subjective score.",
    clarity: { score: 20, rationale: "Clear" },
    evidence: { score: 10, rationale: "Needs evidence" },
    completeness: { score: 15, rationale: "Needs dates" },
    relevance: null,
    strengths: [],
    questions: [],
    recommendations: [
      {
        section: "summary",
        priority: "high",
        evidence: "Built services",
        advice: "Use clear wording.",
        suggestedText: "Developed reliable services.",
        edit: {
          documentId,
          target: {
            section: "summary",
            field: "summary",
            entryId: null,
            index: null,
          },
          before: "Built reliable services.",
          after: "Developed reliable services.",
        },
      },
    ],
  };
}
async function mockCoach(page: any, documentId: string) {
  await page.route("**/api/ai/settings", (route: any) =>
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
  await page.route("**/api/ai/review", (route: any) =>
    route.fulfill({ json: coachingResult(documentId) }),
  );
}

test("AI suggestions apply to draft individually and can be undone and saved", async ({
  page,
  request,
}) => {
  let doc = await create(request);
  doc.summary = "Built reliable services.";
  doc = await (
    await request.put(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`, {
      data: { revision: doc.metadata.revision, document: doc },
    })
  ).json();
  await mockCoach(page, doc.metadata.id);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Review current draft with AI" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Before", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "After", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apply suggestion", exact: true })
    .click();
  await expect(
    page.getByText("Applied to draft.", { exact: true }),
  ).toBeVisible();
  await expect(page.frameLocator("iframe").locator(".summary-text")).toHaveText(
    "Developed reliable services.",
  );
  expect(
    (
      await (
        await request.get(
          `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
        )
      ).json()
    ).summary,
  ).toBe("Built reliable services.");
  await page
    .getByRole("button", { name: "Undo this suggestion", exact: true })
    .click();
  await expect(page.frameLocator("iframe").locator(".summary-text")).toHaveText(
    "Built reliable services.",
  );
  await page
    .getByRole("button", { name: "Apply suggestion", exact: true })
    .click();
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(
              `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
            )
          ).json()
        ).summary,
    )
    .toBe("Developed reliable services.");
  await page.screenshot({
    path: "test-results/apply-suggestion.png",
    fullPage: true,
  });
});

test("AI suggestion cannot overwrite a field edited after review", async ({
  page,
  request,
}) => {
  let doc = await create(request);
  doc.summary = "Built reliable services.";
  doc = await (
    await request.put(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`, {
      data: { revision: doc.metadata.revision, document: doc },
    })
  ).json();
  await mockCoach(page, doc.metadata.id);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Review current draft with AI" })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply suggestion", exact: true }),
  ).toBeEnabled();
  await page
    .getByText("All fields, history, library and backups", { exact: true })
    .click();
  await page
    .locator("summary")
    .filter({ hasText: /^Summary$/ })
    .click();
  await page
    .getByLabel("Summary", { exact: true })
    .fill("My manually revised summary.");
  await expect(
    page.getByRole("button", { name: "Apply suggestion", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("This field changed since the review.", { exact: false }),
  ).toBeVisible();
});

test("job-specific copy preserves the original and restores target context", async ({
  page,
  request,
}) => {
  const doc = await create(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByRole("textbox", { name: "First Name", exact: true })
    .fill("DraftName");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByText("Job-specific resume copy", { exact: true }).click();
  await page.getByLabel("Target company", { exact: true }).fill("Acme");
  await page
    .getByLabel("Target role", { exact: true })
    .fill("Platform Engineer");
  await page
    .getByLabel("Target job description (optional)", { exact: true })
    .fill("Build reliable cloud services.");
  await page
    .getByRole("button", { name: "Create job-specific copy", exact: true })
    .click();
  const link = page.getByRole("link", {
    name: "Open job-specific copy",
    exact: true,
  });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  const original = await (
    await request.get(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`)
  ).json();
  expect(original.profile.firstName).toBe("");
  const variantId = href!.split("/").at(-1);
  const variant = await (
    await request.get(`http://127.0.0.1:8101/api/resumes/${variantId}`)
  ).json();
  expect(variant.profile.firstName).toBe("DraftName");
  expect(variant.metadata.parentResumeId).toBe(doc.metadata.id);
  page.on("dialog", (dialog) => dialog.accept());
  await link.click();
  await expect(page.getByLabel("Target role", { exact: true })).toHaveValue(
    "Platform Engineer",
  );
  await expect(
    page.getByLabel("Target job description (optional)", { exact: true }),
  ).toHaveValue("Build reliable cloud services.");
  await page.reload();
  await expect(page.getByLabel("Target company", { exact: true })).toHaveValue(
    "Acme",
  );
});

test("AI edits follow stable entry IDs and reject changed or missing fields", async ({
  request,
}) => {
  const doc = await create(request);
  doc.experience = [
    {
      id: "first",
      company: "A",
      position: "Engineer",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      summary: "",
      bullets: ["First fact"],
      technologies: [],
    },
    {
      id: "second",
      company: "B",
      position: "Engineer",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      summary: "",
      bullets: ["Second fact"],
      technologies: [],
    },
  ];
  const edit = {
    documentId: doc.metadata.id,
    target: {
      section: "experience" as const,
      field: "bullets" as const,
      entryId: "first",
      index: 0,
    },
    before: "First fact",
    after: "Clarified first fact",
  };
  doc.experience.reverse();
  const changed = applyAIEdit(doc, edit);
  expect(changed.experience[1].bullets[0]).toBe("Clarified first fact");
  expect(changed.experience[0].bullets[0]).toBe("Second fact");
  expect(doc.experience[1].bullets[0]).toBe("First fact");
  expect(applyAIEdit(changed, edit)).toBe(changed);
  expect(applyAIEdit(doc, { ...edit, documentId: "wrong" })).toBe(doc);
  expect(
    applyAIEdit(doc, {
      ...edit,
      target: { ...edit.target, entryId: "deleted" },
    }),
  ).toBe(doc);
});

test("Gemini can be configured and tested without exposing the stored key", async ({
  page,
}) => {
  let config: any = {
    enabled: false,
    provider: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "",
    hasApiKey: true,
  };
  await page.route("**/api/ai/settings", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      expect(body.provider).toBe("gemini");
      expect(body.baseUrl).toBe(
        "https://generativelanguage.googleapis.com/v1beta",
      );
      expect(body.apiKey).toBe("gemini-test-key");
      config = {
        enabled: body.enabled,
        provider: body.provider,
        baseUrl: body.baseUrl,
        model: body.model,
        hasApiKey: true,
      };
    }
    await route.fulfill({ json: config });
  });
  await page.route("**/api/ai/test", (route) =>
    route.fulfill({
      json: {
        ok: true,
        message: "Connection succeeded and the model returned JSON.",
      },
    }),
  );
  await page.goto("/settings");
  await page.getByLabel("Provider", { exact: true }).selectOption("gemini");
  await expect(page.getByLabel("API base URL")).toHaveValue(
    "https://generativelanguage.googleapis.com/v1beta",
  );
  await expect(page.getByLabel("Gemini API key")).toHaveValue("");
  await page.getByLabel("Enable AI reviews").check();
  await page.getByLabel("Model ID").fill("gemini-test-model");
  await page.getByLabel("Gemini API key").fill("gemini-test-key");
  await page
    .getByRole("button", { name: "Save connection", exact: true })
    .click();
  await expect(page.getByLabel("Gemini API key")).toHaveValue("");
  await page.getByRole("button", { name: "Test saved connection" }).click();
  await expect(
    page.getByText("Connection succeeded and the model returned JSON.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Provider", { exact: true })).toHaveValue(
    "gemini",
  );
  await expect(page.getByLabel("Gemini API key")).toHaveValue("");
});
