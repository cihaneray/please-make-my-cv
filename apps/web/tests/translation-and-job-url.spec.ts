import { test, expect } from "@playwright/test";
import type { ResumeDocument } from "../src/lib/types";

const backend = "http://127.0.0.1:8101/api";

test("translation previews the unsaved draft and creates an edited copy only after confirmation", async ({
  page,
  request,
}, testInfo) => {
  const source = (await (
    await request.post(`${backend}/resumes`, {
      data: { title: "Translation source", targetRole: "Backend Engineer" },
    })
  ).json()) as ResumeDocument;
  let translatedInput: ResumeDocument | null = null;
  const copies: unknown[] = [];
  await page.route("**/api/resumes", async (route) => {
    if (route.request().method() === "POST")
      copies.push(route.request().postDataJSON());
    await route.continue();
  });
  await page.route("**/api/ai/translate", async (route) => {
    const payload = route.request().postDataJSON();
    translatedInput = payload.document;
    const translated = structuredClone(payload.document);
    translated.summary =
      "Python API’leri geliştirerek %30 iyileştirme sağladı.";
    translated.metadata.language = "tr";
    await route.fulfill({
      json: {
        document: translated,
        targetLanguage: "tr",
        changes: [
          {
            path: "summary",
            original: payload.document.summary,
            translated: translated.summary,
          },
        ],
      },
    });
  });
  await page.goto(`/resumes/${source.metadata.id}`);
  await page
    .getByRole("button", { name: "Professional Summary", exact: true })
    .click();
  const unsaved = "Built Python APIs with 30% improvement.";
  await page
    .getByRole("textbox", { name: "Professional Summary", exact: true })
    .fill(unsaved);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  const tool = page.locator(".resume-translation");
  await tool.getByText("Translate CV language", { exact: true }).click();
  await tool
    .getByRole("button", { name: "Preview translation", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Review translated CV" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Full CV preview", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    dialog
      .frameLocator("iframe")
      .getByText("Python API’leri geliştirerek %30 iyileştirme sağladı.", {
        exact: true,
      }),
  ).toBeVisible();
  await expect(tool.locator("blockquote")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Close translation preview" })
    .focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Confirm and create separate CV" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close translation preview" }),
  ).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("translation-preview-desktop.png"),
  });
  await dialog
    .getByRole("button", { name: "Edit translation", exact: true })
    .click();
  expect(translatedInput).toMatchObject({ summary: unsaved });
  expect(copies).toHaveLength(0);
  const edited = "Python API servisleri geliştirdi; 30% iyileştirme sağladı.";
  await dialog
    .getByRole("textbox", { name: "Professional summary", exact: true })
    .fill(edited);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    dialog.getByRole("textbox", { name: "Professional summary", exact: true }),
  ).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: testInfo.outputPath("translation-editor-mobile.png"),
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await dialog
    .getByRole("textbox", { name: "New CV title", exact: true })
    .fill("Reviewed Turkish CV");
  // Closing is reversible and never creates a CV or loses review edits.
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(copies).toHaveLength(0);
  await tool
    .getByRole("button", { name: "Open translation draft", exact: true })
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "New CV title", exact: true }),
  ).toHaveValue("Reviewed Turkish CV");
  await expect(
    dialog.frameLocator("iframe").getByText(edited, { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Edit translation", exact: true })
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "Professional summary", exact: true }),
  ).toHaveValue(edited);
  await dialog
    .getByRole("button", {
      name: "Confirm and create separate CV",
      exact: true,
    })
    .click();
  const link = tool.getByRole("link", {
    name: "Open translated CV",
    exact: true,
  });
  await expect(link).toBeVisible();
  expect(copies).toHaveLength(1);
  expect(copies[0]).toMatchObject({
    title: "Reviewed Turkish CV",
    targetRole: "Backend Engineer",
    initialData: {
      summary: edited,
      metadata: { parentResumeId: source.metadata.id, language: "tr" },
    },
  });
  expect(page.url()).toContain(`/resumes/${source.metadata.id}`);
  await expect(link).toHaveAttribute("target", "_blank");
  const createdId = (await link.getAttribute("href"))!.split("/").pop();
  const created = await (
    await request.get(`${backend}/resumes/${createdId}`)
  ).json();
  expect(created.summary).toBe(edited);
  expect(
    await (
      await request.get(`${backend}/resumes/${source.metadata.id}`)
    ).json(),
  ).toEqual(source);
});

test("translation with no diff still shows editable full content and source edits mark the kept draft stale", async ({
  page,
  request,
}) => {
  const source = (await (
    await request.post(`${backend}/resumes`, {
      data: { title: "Unchanged translation source", targetRole: "Engineer" },
    })
  ).json()) as ResumeDocument;
  let creations = 0;
  await page.route("**/api/resumes", async (route) => {
    if (route.request().method() === "POST") creations += 1;
    await route.continue();
  });
  await page.route("**/api/ai/translate", async (route) => {
    const payload = route.request().postDataJSON();
    await route.fulfill({
      json: { document: payload.document, targetLanguage: "tr", changes: [] },
    });
  });
  await page.goto(`/resumes/${source.metadata.id}`);
  await page
    .getByRole("button", { name: "Professional Summary", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Professional Summary", exact: true })
    .fill("Unchanged narrative for review.");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  const tool = page.locator(".resume-translation");
  await tool.getByText("Translate CV language", { exact: true }).click();
  await tool
    .getByRole("button", { name: "Preview translation", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Review translated CV" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog
      .frameLocator("iframe")
      .getByText("Unchanged narrative for review.", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Edit translation", exact: true })
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "Headline", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Professional summary", exact: true })
    .fill("Reviewed narrative without a model diff.");
  await dialog
    .getByRole("button", { name: "Close and keep draft", exact: true })
    .click();
  await expect(
    tool.getByRole("button", { name: "Open translation draft", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await page
    .getByRole("button", { name: "Professional Summary", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Professional Summary", exact: true })
    .fill("A newer source draft.");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(
    tool.getByRole("button", { name: "Open translation draft", exact: true }),
  ).toBeVisible();
  await expect(tool.getByText(/The source CV changed/)).toBeVisible();
  await expect(dialog).toHaveCount(0);
  expect(creations).toBe(0);
  expect(
    await (
      await request.get(`${backend}/resumes/${source.metadata.id}`)
    ).json(),
  ).toEqual(source);
});

test("job URL import supports editable preview and requires normal job confirmation", async ({
  page,
}) => {
  const created: Record<string, unknown>[] = [];
  await page.route("**/api/jobs/import-url", (route) =>
    route.fulfill({
      json: {
        sourceUrl: "https://example.com/jobs/backend",
        company: "Imported Company",
        position: "Backend Engineer",
        description: "Build Python services.",
        extraction: "structured",
        warnings: ["Review fields."],
      },
    }),
  );
  await page.route("**/api/jobs", async (route) => {
    if (route.request().method() === "POST")
      created.push(route.request().postDataJSON());
    await route.continue();
  });
  await page.goto("/jobs");
  await page
    .getByRole("button", { name: "Add Target Job", exact: true })
    .click();
  const tool = page.locator(".job-url-import");
  await tool.getByText("Import from job URL", { exact: true }).click();
  await tool
    .getByRole("textbox", { name: "Job URL", exact: true })
    .fill("https://example.com/jobs/backend");
  await tool.getByRole("button", { name: "Preview job", exact: true }).click();
  await expect(
    tool.getByRole("textbox", { name: "Company", exact: true }),
  ).toHaveValue("Imported Company");
  expect(created).toHaveLength(0);
  await tool
    .getByRole("textbox", { name: "Job description", exact: true })
    .fill("Reviewed Python and Docker role.");
  await tool
    .getByRole("button", { name: "Use fields in form", exact: true })
    .click();
  expect(created).toHaveLength(0);
  const form = page.locator("form").filter({ hasText: "Add New Target Job" });
  await expect(
    form.getByPlaceholder("e.g. Stripe, Linear, Vercel"),
  ).toHaveValue("Imported Company");
  await expect(
    form.getByPlaceholder("e.g. Staff Software Engineer"),
  ).toHaveValue("Backend Engineer");
  await form
    .getByRole("button", { name: "Save & Analyze", exact: true })
    .click();
  await expect.poll(() => created.length).toBe(1);
  expect(created[0]).toMatchObject({
    company: "Imported Company",
    position: "Backend Engineer",
    description: "Reviewed Python and Docker role.",
  });
});


test("translation editor filters compact sections and saves edited project titles", async ({ page, request }, testInfo) => {
  const doc = await (await request.post(backend + "/resumes", { data: { title: "Project translation QA" } })).json();
  doc.projects = [{ id: "translated-project", name: "Sales anomaly detection system", role: "Developer",
    url: "https://example.com/project", startDate: "", endDate: "", technologies: ["Python"], bullets: ["Built Python services."] }];
  doc.skills = ["Languages", "Frameworks", "Databases", "Tools", "Cloud"].map(category => ({ category, skills: ["Python"] }));
  const source = await (await request.put(backend + "/resumes/" + doc.metadata.id,
    { data: { revision: doc.metadata.revision, document: doc } })).json();
  await page.route("**/api/ai/translate", route => {
    const payload = route.request().postDataJSON();
    const document = structuredClone(payload.document);
    document.metadata.language = "tr";
    document.projects[0].name = "Satış anomali tespit sistemi";
    return route.fulfill({ json: { document, targetLanguage: "tr", changes: [] } });
  });
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  const tool = page.locator(".resume-translation");
  await tool.getByText("Translate CV language", { exact: true }).click();
  await tool.getByRole("button", { name: "Preview translation", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Review translated CV" });
  await dialog.getByRole("button", { name: "Edit translation", exact: true }).click();
  await dialog.getByRole("navigation", { name: "Translation sections" }).getByRole("button", { name: "Projects", exact: true }).click();
  await expect(dialog.getByLabel("Project title", { exact: true })).toHaveValue("Satış anomali tespit sistemi");
  await dialog.getByLabel("Project title", { exact: true }).fill("İncelenmiş proje başlığı");
  await dialog.getByRole("navigation", { name: "Translation sections" }).getByRole("button", { name: "Skills", exact: true }).click();
  await expect(dialog.locator("fieldset")).toHaveCount(5);
  expect((await dialog.getByLabel("Skill category", { exact: true }).first().boundingBox())!.height).toBeLessThanOrEqual(48);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: "dark" });
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`translation-sections-${width}.png`) });
  }
  await dialog.getByRole("button", { name: "Confirm and create separate CV", exact: true }).click();
  const link = tool.getByRole("link", { name: "Open translated CV", exact: true });
  await expect(link).toBeVisible();
  const id = (await link.getAttribute("href"))!.split("/").pop();
  const copy = await (await request.get(backend + "/resumes/" + id)).json();
  expect(copy.projects[0].name).toBe("İncelenmiş proje başlığı");
  expect(copy.projects[0].technologies).toEqual(["Python"]);
  expect(await (await request.get(backend + "/resumes/" + doc.metadata.id)).json()).toEqual(source);
});
