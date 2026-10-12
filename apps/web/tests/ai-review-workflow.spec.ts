import { test, expect } from "@playwright/test";

const API = "http://127.0.0.1:8101/api";

test("review overview, filters, field navigation and saved history preserve the draft", async ({ page, request }, testInfo) => {
  const doc = await (await request.post(API + "/resumes", { data: { title: "Review workflow QA" } })).json();
  doc.summary = "Built reliable services.";
  const source = await (await request.put(API + "/resumes/" + doc.metadata.id, { data: { revision: doc.metadata.revision, document: doc } })).json();
  await page.route("**/api/ai/settings", route => route.fulfill({ json: { enabled: true, provider: "ollama", model: "test", hasApiKey: false } }));
  let reviewCalls = 0;
  await page.route("**/api/ai/review", route => {
    reviewCalls++;
    const payload = route.request().postDataJSON();
    return route.fulfill({ json: {
      score: 70, summary: "Review the wording and verify your evidence.", model: "test", provider: "ollama", notice: "Subjective review.",
      clarity: { score: 20, rationale: "Use direct wording." }, evidence: { score: 15, rationale: "Explain verified outcomes." },
      completeness: { score: 20, rationale: "Core sections included." }, relevance: null, strengths: ["Clear scope"], questions: [],
      recommendations: [
        { section: "summary", priority: "high", evidence: payload.document.summary, advice: "Keep the statement accurate.",
          suggestedText: "Developed reliable services.", edit: { documentId: doc.metadata.id, before: payload.document.summary, after: "Developed reliable services.", target: { section: "summary", field: "summary", entryId: null, index: null } } },
        { section: "experience", priority: "medium", evidence: "No outcome supplied.", advice: "Describe a verified outcome.", suggestedText: "" },
      ],
    } });
  });
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByRole("button", { name: "Review current draft with AI" }).click();
  await expect(page.getByRole("heading", { name: "Recommended next steps" })).toBeVisible();
  const filters = page.getByRole("navigation", { name: "Suggestion status" });
  await expect(filters.getByRole("button", { name: /^Pending\s*2$/ })).toBeVisible();
  const cards = page.locator("[data-review-recommendation]");
  await cards.nth(1).getByRole("button", { name: "Skip suggestion" }).click();
  await filters.getByRole("button", { name: /^Skipped\s*1$/ }).click();
  await expect(cards.nth(0)).toBeHidden();
  await expect(cards.nth(1)).toBeVisible();
  await cards.nth(1).getByRole("button", { name: "Show skipped suggestion" }).click();
  await filters.getByRole("button", { name: /^Pending\s*2$/ }).click();
  await cards.nth(0).getByLabel("Suggested text").fill("Built and maintained reliable services.");
  await cards.nth(0).getByRole("button", { name: "Apply suggestion", exact: true }).click();
  await expect(filters.getByRole("button", { name: /^Applied\s*1$/ })).toBeVisible();
  await filters.getByRole("button", { name: /^Applied\s*1$/ }).click();
  await expect(cards.nth(0)).toBeVisible();
  await cards.nth(0).getByRole("button", { name: "Undo this suggestion" }).click();
  await filters.getByRole("button", { name: /^Pending\s*2$/ }).click();
  await cards.nth(0).getByRole("button", { name: "Go to field" }).click();
  await expect(page.getByRole("textbox", { name: "Professional Summary", exact: true })).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Professional Summary", exact: true })).toHaveValue(source.summary);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect.poll(async () => (await (await request.get(API + "/ai/reviews", { params: { resumeId: doc.metadata.id, language: "en", jobDescription: "" } })).json()).length).toBe(1);
  const history = page.getByRole("region", { name: "AI review history", exact: true });
  await expect(history.getByRole("button", { name: "View saved review" })).toBeVisible();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`ai-review-${width}.png`) });
  }
  await page.reload();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await history.getByRole("button", { name: "View saved review" }).click();
  await expect(history).toContainText("Review the wording and verify your evidence.");
  expect(reviewCalls).toBe(1);
  expect(await (await request.get(API + "/resumes/" + doc.metadata.id)).json()).toEqual(source);
});
