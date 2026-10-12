import { test, expect } from "@playwright/test";
import { localizeReportText, localizeRuleIssue } from "../src/lib/report-copy";
import { formatFieldLabel } from "../src/lib/field-label";
import { copyTranslations } from "../src/lib/copy";

test("numbered generic fields localize the label without changing the value", () => {
  const translations = copyTranslations;
  expect(
    formatFieldLabel("skills 2", (text) => translations[text] || text),
  ).toBe("Yetkinlikler 2");
  expect(
    formatFieldLabel("customSections 12", (text) => translations[text] || text),
  ).toBe("Özel bölümler 12");
  expect(formatFieldLabel("skills 2", (text) => text)).toBe("Skills 2");
});

test("only known rule diagnostics localize, retaining evidence and English reports", () => {
  const issue = {
    ruleId: "fact-weak-verb-0-0",
    severity: "warning" as const,
    section: "experience",
    message: "Vague opening detected: 'worked on'",
    suggestion:
      "Replace passive participation phrasing with concrete active verbs (e.g. Developed, Designed, Automated).",
    targetId: null,
  };
  expect(localizeRuleIssue(issue, "tr").message).toBe(
    "Belirsiz başlangıç tespit edildi: 'worked on'",
  );
  expect(localizeRuleIssue(issue, "en")).toBe(issue);
  expect(
    localizeRuleIssue({ ...issue, ruleId: "custom-review" }, "tr").message,
  ).toBe(issue.message);
  expect(localizeReportText("Bullet is excessively long (113 words).")).toBe(
    "Başarı maddesi çok uzun (113 kelime).",
  );
  expect(localizeReportText("My original English CV prose")).toBe(
    "My original English CV prose",
  );
});

test("Turkish findings use interface language while the English CV stays intact", async ({
  page,
  request,
}) => {
  const created = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "English career history", targetRole: "Engineer" },
  });
  const doc = await created.json();
  await page.addInitScript(() => {
    if (!localStorage.getItem("cv_workspace_language"))
      localStorage.setItem("cv_workspace_language", "tr");
  });
  await page.route("**/api/resumes/*/analysis", (route) =>
    route.fulfill({
      json: {
        resumeId: doc.metadata.id,
        overallScore: 70,
        atsCompatibilityScore: 70,
        contentQualityScore: 80,
        wordCount: 100,
        bulletCount: 12,
        strengths: ["Documented experience (12 accomplishment bullets)."],
        atsBreakdown: null,
        heuristicNotice: null,
        calculatedAt: new Date().toISOString(),
        issues: [
          {
            ruleId: "ats-bullet-length-1",
            severity: "warning",
            section: "experience",
            message: "Bullet is excessively long (113 words).",
            suggestion:
              "Paragraph-length bullets reduce ATS scanning accuracy and recruiter readability. Split into 2 concise bullets.",
            targetId: null,
          },
        ],
      },
    }),
  );
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "İnceleme", exact: true }).click();
  await expect(
    page.getByText("Başarı maddesi çok uzun (113 kelime).", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Deneyim belgelenmiş (12 başarı maddesi).", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Uyarı", { exact: true })).toBeVisible();
  await expect(
    page.getByText("İki kısa maddeye ayırın.", { exact: false }),
  ).toBeVisible();
  const saved = await request.get(
    `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
  );
  expect(await saved.json()).toEqual(doc);
  await page.evaluate(() =>
    localStorage.setItem("cv_workspace_language", "en"),
  );
  await page.reload();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(
    page.getByText("Bullet is excessively long (113 words).", { exact: true }),
  ).toBeVisible();
});
