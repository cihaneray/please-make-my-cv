import { test, expect } from "@playwright/test";

test("AI review, options and applied suggestions survive editor tab changes", async ({
  page,
  request,
}) => {
  const response = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "Review session QA", targetRole: "Engineer" },
  });
  const doc = await response.json();
  let calls = 0;
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
  await page.route("**/api/ai/review", async (route) => {
    calls++;
    if (calls === 2) {
      await route.fulfill({
        status: 503,
        json: {
          error: { code: "AI_UNAVAILABLE", message: "Test model unavailable" },
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        score: 70,
        summary: "Review session evidence",
        model: "test-model",
        provider: "ollama",
        notice: "Test feedback",
        clarity: { score: 20, rationale: "Clear" },
        evidence: { score: 15, rationale: "Evidence" },
        completeness: { score: 20, rationale: "Complete" },
        relevance: null,
        strengths: ["Original strength"],
        questions: [],
        recommendations: [
          {
            section: "summary",
            priority: "high",
            evidence: "Original",
            advice: "Verify this text",
            suggestedText: "Reviewed summary",
            edit: {
              documentId: doc.metadata.id,
              target: {
                section: "summary",
                field: "summary",
                entryId: null,
                index: null,
              },
              before: doc.summary,
              after: "Reviewed summary",
            },
          },
        ],
      },
    });
  });
  await page.goto(`/resumes/${doc.metadata.id}`);
  const reviewTab = page.getByRole("button", { name: "Review", exact: true });
  await reviewTab.click();
  await page
    .getByLabel("Target job description (optional)")
    .fill("Python services");
  await page.getByLabel("Feedback language").selectOption("tr");
  await page
    .getByRole("button", { name: "Review current draft with AI" })
    .click();
  await expect(page.getByText("Review session evidence")).toBeVisible();
  await page
    .getByRole("button", { name: "Apply suggestion", exact: true })
    .click();
  await expect(
    page.getByText("Applied to draft.", { exact: true }),
  ).toBeVisible();
  for (const tab of ["Content", "Design", "Source"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await expect(page.getByText("Review session evidence")).not.toBeVisible();
    await reviewTab.click();
    await expect(page.getByText("Review session evidence")).toBeVisible();
    await expect(
      page.getByText("Applied to draft.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Target job description (optional)"),
    ).toHaveValue("Python services");
    await expect(page.getByLabel("Feedback language")).toHaveValue("tr");
  }
  expect(calls).toBe(1);
  await page
    .getByRole("button", { name: "Undo this suggestion", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review current draft with AI" })
    .click();
  await expect(page.locator(".ai-review-error")).toContainText(
    "Test model unavailable",
  );
  await expect(page.getByText("Review session evidence")).toBeVisible();
  expect(calls).toBe(2);
});
