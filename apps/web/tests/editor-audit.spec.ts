import { test, expect, type Page } from "@playwright/test";
import type { ResumeDocument } from "../src/lib/types";

// All browser API traffic is mocked; these tests never write production data or call AI.
async function setup(page: Page) {
  let doc: ResumeDocument;
  let saved = 0;
  let previews = 0;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/resumes/audit-editor") {
      if (request.method() === "PUT") {
        doc = request.postDataJSON().document;
        doc.metadata.revision++;
        doc.metadata.updatedAt = "2026-10-12T01:00:00Z";
        saved++;
      }
      return route.fulfill({ json: doc });
    }
    if (path === "/api/ai/translate") {
      const translated = request.postDataJSON().document;
      translated.summary = "Translated candidate";
      return route.fulfill({
        json: { document: translated, targetLanguage: "tr", changes: [] },
      });
    }
    if (path.endsWith("/preview")) {
      previews++;
      return route.fulfill({
        contentType: "text/html",
        body: "<html><body><article class='cv-page'><section>Mock CV</section></article></body></html>",
      });
    }
    if (path.endsWith("/analysis"))
      return route.fulfill({
        json: {
          resumeId: "audit-editor",
          overallScore: 0,
          atsCompatibilityScore: 0,
          contentQualityScore: 0,
          issues: [],
          wordCount: 3,
          bulletCount: 0,
          strengths: [],
          atsBreakdown: null,
          heuristicNotice: null,
          calculatedAt: "2026-10-12",
        },
      });
    if (path.includes("settings"))
      return route.fulfill({ json: { provider: "none", enabled: false } });
    return route.fulfill({ json: [] });
  });
  // Use the API's schema defaults as a fixture, then intercept every browser request.
  const response = await page.request.post(
    "http://127.0.0.1:8101/api/resumes",
    { data: { title: "Audit temporary CV" } },
  );
  doc = await response.json();
  doc.metadata.id = "audit-editor";
  doc.summary = "Original source narrative";
  await page.goto("/resumes/audit-editor");
  await expect(page.getByLabel("Resume title", { exact: true })).toHaveValue(
    doc.metadata.title,
  );
  return { saved: () => saved, previews: () => previews };
}

async function translation(page: Page) {
  await page.getByRole("button", { name: "Review", exact: true }).click();
  const tool = page.locator(".resume-translation");
  await tool.getByText("Translate CV language", { exact: true }).click();
  await tool
    .getByRole("button", { name: "Preview translation", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Review translated CV" });
  await dialog
    .getByRole("button", { name: "Edit translation", exact: true })
    .click();
  return { tool, dialog };
}

test("kept edits survive a metadata-only save and source edits mark the draft stale", async ({
  page,
}) => {
  const state = await setup(page);
  const { tool, dialog } = await translation(page);
  await dialog
    .getByRole("textbox", { name: "Professional summary", exact: true })
    .fill("Manually corrected translation");
  await dialog
    .getByRole("button", { name: "Close and keep draft", exact: true })
    .click();
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect.poll(state.saved).toBe(1);
  await tool
    .getByRole("button", { name: "Open translation draft", exact: true })
    .click();
  await expect(dialog.getByText(/based on earlier source text/)).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Edit translation", exact: true })
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "Professional summary", exact: true }),
  ).toHaveValue("Manually corrected translation");
  await dialog
    .getByRole("button", { name: "Close and keep draft", exact: true })
    .click();
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await page
    .getByRole("button", { name: "Professional Summary", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Professional Summary", exact: true })
    .fill("Updated source narrative");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(tool.getByText(/The source CV changed/)).toBeVisible();
  await tool
    .getByRole("button", { name: "Open translation draft", exact: true })
    .click();
  await expect(dialog.getByText(/based on earlier source text/)).toBeVisible();
  await dialog
    .getByRole("button", { name: "Edit translation", exact: true })
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "Professional summary", exact: true }),
  ).toHaveValue("Manually corrected translation");
});

for (const width of [1280, 390]) {
  test(`family read can be dismissed and reopened while pending at ${width}px`, async ({
    page,
  }) => {
    await setup(page);
    await page.setViewportSize({ width, height: 844 });
    // Never settle the first request; closing must abort it without waiting.
    let requests = 0;
    await page.route("**/api/resumes/audit-editor/family", async (route) => {
      requests++;
      if (requests === 1) return;
      return route.fulfill({
        json: {
          comparedFields: 0,
          source: { id: "audit-editor", title: "Reopened source", revision: 1 },
          root: { id: "audit-editor", title: "Root" },
          documents: [],
          variants: [],
          findings: [],
        },
      });
    });
    const trigger = page.getByRole("button", {
      name: "CV family",
      exact: true,
    });
    const dialog = page.getByRole("dialog", { name: "CV family", exact: true });
    await trigger.click();
    await expect.poll(() => requests).toBe(1);
    await expect(
      dialog.getByRole("button", { name: "Close CV family" }),
    ).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(
      dialog.getByText("Reopened source", { exact: true }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Close CV family" }).click();
    await expect(dialog).toBeHidden();
  });
}

test("PDF check Retry retries the check and HTML refresh cannot clear its failure", async ({
  page,
}) => {
  const state = await setup(page);
  await expect.poll(state.previews).toBeGreaterThan(0);
  let checks = 0;
  await page.route("**/api/resumes/audit-editor/pdf-check", async (route) => {
    checks++;
    if (checks === 1)
      return route.fulfill({
        status: 503,
        json: { detail: "PDF validation temporarily unavailable" },
      });
    return route.fulfill({
      json: { pageCount: 2, issues: [], notice: "Test PDF check completed" },
    });
  });
  await page
    .getByRole("button", { name: "Check PDF output", exact: true })
    .click();
  const error = page
    .getByRole("alert")
    .filter({ hasText: "PDF validation temporarily unavailable" });
  await expect(error).toBeVisible();
  // A concurrent HTML request must not clear the PDF failure.
  const oldPreviews = state.previews();
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await page
    .getByRole("button", { name: "Professional Summary", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Professional Summary", exact: true })
    .fill("Changed preview");
  // The document changed, so check that it can fail afresh on the new source.
  checks = 0;
  await page
    .getByRole("button", { name: "Check PDF output", exact: true })
    .click();
  await expect(error).toBeVisible();
  await expect.poll(state.previews).toBeGreaterThan(oldPreviews);
  await expect(page.getByTestId("reading-map-toggle")).toBeEnabled();
  await expect(error).toBeVisible();
  const before = state.previews();
  await error.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByText("Test PDF check completed", { exact: true }),
  ).toBeVisible();
  expect(checks).toBe(2);
  expect(state.previews()).toBe(before);
  await expect(error).toBeHidden();
});

test("translation filter keeps focus across keyboard activation and typing", async ({
  page,
}) => {
  await setup(page);
  const { dialog } = await translation(page);
  const nav = dialog.getByRole("navigation", { name: "Translation sections" });
  const summary = nav.getByRole("button", { name: "Summary", exact: true });
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(summary).toHaveAttribute("aria-pressed", "true");
  await expect(summary).toBeFocused();
  await page.keyboard.press("Tab");
  const text = dialog.getByRole("textbox", {
    name: "Professional summary",
    exact: true,
  });
  await expect(text).toBeFocused();
  await text.fill("Keyboard-edited translation");
  await expect(text).toBeFocused();
});
