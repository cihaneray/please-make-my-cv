import { test, expect } from "@playwright/test";
import type { ResumeDocument } from "../src/lib/types";

const backend = "http://127.0.0.1:8101/api";

test("translation previews the unsaved draft and creates an edited copy only after confirmation", async ({
  page,
  request,
}) => {
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
  await expect(
    tool.getByRole("textbox", { name: "Translation: summary", exact: true }),
  ).toBeVisible();
  expect(translatedInput).toMatchObject({ summary: unsaved });
  expect(copies).toHaveLength(0);
  const edited = "Python API servisleri geliştirdi; 30% iyileştirme sağladı.";
  await tool
    .getByRole("textbox", { name: "Translation: summary", exact: true })
    .fill(edited);
  await tool
    .getByRole("textbox", { name: "New CV title", exact: true })
    .fill("Reviewed Turkish CV");
  await tool
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
