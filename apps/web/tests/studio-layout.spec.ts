import { test, expect, APIRequestContext } from "@playwright/test";
import { ResumeDocument } from "../src/lib/types";

async function createResume(request: APIRequestContext) {
  const response = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: {
      title:
        "A very long resume title for a senior engineer with international experience and many projects",
    },
  });
  expect(response.ok()).toBeTruthy();
  const doc: ResumeDocument = await response.json();
  doc.experience = ["first", "second"].map((id) => ({
    id,
    company: `Company ${id}`,
    position: `Engineer ${id}`,
    location: "",
    startDate: "2020-01",
    endDate: "",
    current: true,
    summary: "",
    bullets: [`Unique achievement ${id}`],
    technologies: [],
  }));
  doc.education = [
    {
      id: "education",
      institution: "Example University",
      degree: "BSc",
      fieldOfStudy: "Computing",
      location: "",
      startDate: "2016",
      endDate: "2020",
      current: false,
      grade: "",
      highlights: [],
    },
  ];
  doc.projects = [
    {
      id: "project",
      name: "Example project",
      role: "Lead",
      url: "",
      startDate: "",
      endDate: "",
      bullets: ["Built a project"],
      technologies: [],
    },
  ];
  const saved = await request.put(
    `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
    { data: { document: doc, revision: doc.metadata.revision } },
  );
  expect(saved.ok()).toBeTruthy();
  return (await saved.json()) as ResumeDocument;
}

test("long title, focused outline, toolbar and recovery remain separate at desktop and mobile widths", async ({
  page,
  request,
}, testInfo) => {
  const doc = await createResume(request);
  await page.addInitScript((document) => {
    localStorage.setItem(
      `cv-draft-${document.metadata.id}`,
      JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        document: { ...document, summary: "Recovered content" },
      }),
    );
  }, doc);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await expect(
    page.getByRole("button", { name: "Recover", exact: true }),
  ).toBeVisible();
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByLabel("Resume title", { exact: true }).focus();
    const bounds = await page.evaluate(() => {
      const title = document
        .querySelector(".studio-document-title input")!
        .getBoundingClientRect();
      const actions = document
        .querySelector(".studio-actions")!
        .getBoundingClientRect();
      return {
        title: {
          left: title.left,
          right: title.right,
          top: title.top,
          bottom: title.bottom,
        },
        actions: {
          left: actions.left,
          right: actions.right,
          top: actions.top,
          bottom: actions.bottom,
        },
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(bounds.title.right).toBeLessThanOrEqual(width);
    expect(bounds.actions.right).toBeLessThanOrEqual(width);
    expect(bounds.scrollWidth).toBeLessThanOrEqual(width);
    expect(
      bounds.title.right + 2 <= bounds.actions.left ||
        bounds.title.bottom + 2 <= bounds.actions.top,
    ).toBeTruthy();
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: testInfo.outputPath(`studio-${width}.png`),
        fullPage: true,
      });
  }
  await page
    .getByRole("button", { name: "Discard recovered draft", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recover", exact: true }),
  ).toHaveCount(0);
});

test("entry folds preserve edits, section switching and reordering; search expands and focuses a match", async ({
  page,
  request,
}) => {
  const doc = await createResume(request);
  await page.goto(`/resumes/${doc.metadata.id}?section=experience`);
  const entry = page.locator("#entry-first");
  await entry.getByLabel("Company", { exact: true }).fill("Edited company");
  await entry
    .getByRole("button", {
      name: "Collapse entry: Engineer first",
      exact: true,
    })
    .click();
  await expect(entry.getByLabel("Company", { exact: true })).toBeHidden();
  await page
    .locator("#entry-second")
    .getByRole("button", { name: "Move up: Engineer second", exact: true })
    .click();
  await expect(
    entry.getByRole("button", {
      name: "Expand entry: Engineer first",
      exact: true,
    }),
  ).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("button", { name: "Search and commands", exact: true })
    .click();
  await page
    .getByLabel("Search CV or actions")
    .fill("Unique achievement first");
  await page
    .locator(".command-results button")
    .filter({ hasText: "Unique achievement first" })
    .click();
  await expect(
    entry.getByRole("button", {
      name: "Collapse entry: Engineer first",
      exact: true,
    }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    entry.locator("textarea").filter({ hasText: "Unique achievement first" }),
  ).toBeFocused();
  await expect(entry.getByLabel("Company", { exact: true })).toHaveValue(
    "Edited company",
  );
  for (const [section, id, title] of [
    ["education", "education", "Example University"],
    ["projects", "project", "Example project"],
  ]) {
    await page
      .locator(".studio-outline button")
      .filter({ hasText: new RegExp(section, "i") })
      .click();
    const card = page.locator(`#entry-${id}`);
    await card
      .getByRole("button", { name: `Collapse entry: ${title}`, exact: true })
      .click();
    await expect(card.locator("input").first()).toBeHidden();
    await card
      .getByRole("button", { name: `Expand entry: ${title}`, exact: true })
      .click();
    await expect(card.locator("input").first()).toBeVisible();
  }
  await page.getByRole("button", { name: "Add Project", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Collapse entry: Untitled project",
      exact: true,
    }),
  ).toHaveAttribute("aria-expanded", "true");
});
