import { test, expect } from "@playwright/test";

test("AI suggestion applies edited wording and undo restores the reviewed text", async ({
  page,
  request,
}) => {
  const created = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "Editable suggestion QA", targetRole: "Engineer" },
  });
  const doc = await created.json();
  doc.summary = "Built reliable services.";
  const saved = await request.put(
    `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
    { data: { revision: doc.metadata.revision, document: doc } },
  );
  const reviewedDoc = await saved.json();

  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        provider: "ollama",
        model: "test-model",
        baseUrl: "http://localhost:11434",
        hasApiKey: false,
      },
    }),
  );
  await page.route("**/api/ai/review", (route) =>
    route.fulfill({
      json: {
        score: 70,
        summary: "Review evidence",
        model: "test-model",
        provider: "ollama",
        notice: "Test feedback",
        clarity: { score: 20, rationale: "Clear" },
        evidence: { score: 15, rationale: "Evidence" },
        completeness: { score: 20, rationale: "Complete" },
        relevance: null,
        strengths: [],
        questions: [],
        recommendations: [
          {
            section: "summary",
            priority: "high",
            evidence: "Original",
            advice: "Keep the statement accurate.",
            suggestedText: "Developed reliable services.",
            edit: {
              documentId: reviewedDoc.metadata.id,
              target: {
                section: "summary",
                field: "summary",
                entryId: null,
                index: null,
              },
              before: reviewedDoc.summary,
              after: "Developed reliable services.",
            },
          },
        ],
      },
    }),
  );

  await page.goto(`/resumes/${reviewedDoc.metadata.id}`);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page
    .getByRole("button", { name: "Review current draft with AI" })
    .click();
  const suggestion = page.locator(".ai-suggestion");
  await suggestion
    .getByRole("textbox", { name: "Suggested text" })
    .fill("Built and maintained reliable services for customers.");
  await suggestion
    .getByRole("button", { name: "Apply suggestion", exact: true })
    .click();

  await expect(page.frameLocator("iframe").locator(".summary-text")).toHaveText(
    "Built and maintained reliable services for customers.",
  );
  await expect(
    suggestion.getByRole("textbox", { name: "Suggested text" }),
  ).toHaveValue("Built and maintained reliable services for customers.");
  await suggestion
    .getByRole("button", { name: "Undo this suggestion", exact: true })
    .click();
  await expect(page.frameLocator("iframe").locator(".summary-text")).toHaveText(
    "Built reliable services.",
  );
  await expect(
    suggestion.getByRole("button", { name: "Apply suggestion", exact: true }),
  ).toBeEnabled();
});
