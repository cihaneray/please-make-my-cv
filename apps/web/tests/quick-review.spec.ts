import { selectMenu } from "./helpers/select-menu";
import { test, expect } from "@playwright/test";

const settings = {
  enabled: true,
  provider: "ollama",
  model: "mock-model",
  baseUrl: "http://localhost:11434",
  hasApiKey: false,
};
const reviewResult = {
  score: 80,
  summary: "A clear saved CV, with room for stronger evidence.",
  model: "mock-model",
  provider: "ollama",
  notice: "AI feedback, not an ATS certification.",
  clarity: { score: 20, rationale: "Clear language." },
  evidence: { score: 20, rationale: "Add verified outcomes." },
  completeness: { score: 20, rationale: "Core sections present." },
  relevance: null,
  strengths: ["Concise career summary."],
  questions: ["What outcome can you verify?"],
  recommendations: [
    {
      section: "summary",
      priority: "medium",
      evidence: "The summary is generic.",
      advice: "Add a verified specialty.",
      suggestedText: "Builds reliable APIs with Python.",
      edit: null,
    },
  ],
};

test("saved CV reviews run only on request and never modify the source", async ({
  page,
  request,
}) => {
  const document = await (
    await request.post("http://127.0.0.1:8101/api/resumes", {
      data: { title: "Quick review original" },
    })
  ).json();
  const job = await (
    await request.post("http://127.0.0.1:8101/api/jobs", {
      data: {
        company: "Review company",
        position: "Backend review",
        description: "Build Python services.",
        requirements: ["Python"],
      },
    })
  ).json();
  let reviews = 0;
  const inputs: Array<{
    document: { metadata: { id: string } };
    jobDescription: string;
    language: string;
  }> = [];
  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({ json: settings }),
  );
  await page.route("**/api/ai/review", (route) => {
    reviews += 1;
    inputs.push(route.request().postDataJSON());
    return route.fulfill({ json: reviewResult });
  });
  await page.goto("/resumes?q=Quick%20review%20original");
  const opener = page.getByRole("button", {
    name: "Review CV: Quick review original",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Review saved CV" });
  const start = dialog.getByRole("button", {
    name: "Start AI review",
    exact: true,
  });
  await expect(start).toBeEnabled();
  expect(reviews).toBe(0);
  await start.click();
  await expect(
    dialog.getByRole("region", { name: "AI review results" }),
  ).toContainText("80/100");
  expect(inputs[0].jobDescription).toBe("");
  expect(inputs[0].document.metadata.id).toBe(document.metadata.id);
  await expect(dialog.getByRole("button", { name: /Apply/ })).toHaveCount(0);
  await expect(
    dialog.getByText("Builds reliable APIs with Python."),
  ).toBeVisible();
  await selectMenu(dialog.getByLabel("Review target"), job.id);
  await expect(
    dialog.getByRole("region", { name: "AI review results" }),
  ).toContainText(
    "Draft or review options changed. Run a new review for an updated score.",
  );
  await selectMenu(dialog.getByLabel("Feedback language"), "tr");
  await start.click();
  await expect.poll(() => reviews).toBe(2);
  await expect(
    dialog.getByRole("region", { name: "AI review results" }),
  ).toBeVisible();
  expect(reviews).toBe(2);
  expect(inputs[1].jobDescription).toContain("Build Python services.");
  expect(inputs[1].jobDescription).toContain("Requirements: Python");
  expect(inputs[1].language).toBe("tr");
  await expect(
    dialog.getByRole("link", { name: "Open editor to make changes" }),
  ).toHaveAttribute("href", `/resumes/${document.metadata.id}`);
  expect(
    await (
      await request.get(
        `http://127.0.0.1:8101/api/resumes/${document.metadata.id}`,
      )
    ).json(),
  ).toEqual(document);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("quick review handles provider errors and disabled AI without automatic requests", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "Quick review errors" },
  });
  let enabled = false;
  let reviews = 0;
  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({ json: { ...settings, enabled } }),
  );
  await page.route("**/api/ai/review", (route) => {
    reviews += 1;
    return route.fulfill({
      status: 429,
      json: {
        error: { code: "AI_PROVIDER_ERROR", message: "Provider quota reached" },
      },
    });
  });
  await page.goto("/resumes?q=Quick%20review%20errors");
  const opener = page.getByRole("button", {
    name: "Review CV: Quick review errors",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Review saved CV" });
  await expect(
    dialog.getByRole("button", { name: "Start AI review", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByText("Enable AI reviews in Settings before starting."),
  ).toBeVisible();
  expect(reviews).toBe(0);
  await dialog.getByRole("button", { name: "Close review" }).click();
  enabled = true;
  await opener.click();
  await dialog
    .getByRole("button", { name: "Start AI review", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Provider quota reached",
  );
  await expect(
    dialog.getByRole("button", { name: "Start AI review", exact: true }),
  ).toBeEnabled();
  expect(reviews).toBe(1);
});
