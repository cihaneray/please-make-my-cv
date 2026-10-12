import { test, expect } from "@playwright/test";

test("missing facts generate explicitly and proposals require individual acceptance", async ({ page, request }) => {
  const response = await request.post("http://127.0.0.1:8101/api/resumes", { data: { title: "Missing facts QA" } });
  const doc = await response.json();
  doc.summary = "Built reliable services.";
  const saved = await request.put(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`, { data: { revision: doc.metadata.revision, document: doc } });
  const draft = await saved.json();
  await page.route("**/api/ai/settings", route => route.fulfill({ json: { enabled: true, provider: "ollama", model: "test", hasApiKey: false } }));
  await page.route("**/api/ai/review", route => route.fulfill({ json: {
    score: 70, summary: "Review", model: "test", provider: "ollama", notice: "Review notice",
    clarity: { score: 20, rationale: "Clear" }, evidence: { score: 15, rationale: "Evidence" },
    completeness: { score: 20, rationale: "Complete" }, relevance: null,
    strengths: [], recommendations: [], questions: ["Who used your services?"],
  } }));
  let generated = 0;
  await page.route("**/api/ai/missing-facts", route => {
    generated++;
    const input = route.request().postDataJSON();
    expect(input.answers).toEqual([{ question: "Who used your services?", answer: "Two internal teams." }]);
    return route.fulfill({ json: { model: "test", provider: "ollama", notice: "User supplied", recommendations: [{
      section: "summary", priority: "high", evidence: "User supplied: two internal teams",
      advice: "Review the added context", suggestedText: "Built reliable services for two internal teams.",
      edit: { documentId: draft.metadata.id, before: draft.summary, after: "Built reliable services for two internal teams.",
        target: { section: "summary", field: "summary", entryId: null, index: null } },
    }] } });
  });
  await page.goto(`/resumes/${draft.metadata.id}`);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByRole("button", { name: "Review current draft with AI" }).click();
  const panel = page.getByRole("region", { name: "Missing resume details" });
  const generate = panel.getByRole("button", { name: "Generate proposed changes using my answers" });
  await expect(generate).toBeDisabled();
  await panel.getByRole("textbox", { name: "Who used your services?" }).fill("Two internal teams.");
  expect(generated).toBe(0);
  await generate.click();
  const apply = panel.getByRole("button", { name: "Apply suggestion", exact: true });
  await expect(apply).toBeEnabled();
  await expect(page.frameLocator("iframe").locator(".summary-text")).toHaveText(draft.summary);
  await panel.getByRole("textbox", { name: "Who used your services?" }).fill("Unknown");
  await expect(apply).toBeDisabled();
  await panel.getByRole("textbox", { name: "Who used your services?" }).fill("Two internal teams.");
  await apply.click();
  await expect(page.frameLocator("iframe").locator(".summary-text")).toHaveText("Built reliable services for two internal teams.");
  expect(generated).toBe(1);
});
