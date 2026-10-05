import { test, expect, APIRequestContext } from "@playwright/test";
import { ResumeDocument } from "../src/lib/types";

async function createDocument(
  request: APIRequestContext,
  title = "Editorial example",
) {
  const response = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title, targetRole: "Product Designer" },
  });
  expect(response.ok()).toBeTruthy();
  const doc: ResumeDocument = await response.json();
  doc.profile.firstName = "Alex";
  doc.profile.lastName = "Morgan";
  doc.profile.headline = "Product Designer";
  doc.summary = "Designs thoughtful tools for people and teams.";
  doc.experience = [
    {
      id: "editorial-experience",
      company: "Example Studio",
      position: "Designer",
      location: "",
      startDate: "2022-01",
      endDate: "",
      current: true,
      summary: "",
      bullets: ["Designed accessible editing workflows."],
      technologies: [],
    },
  ];
  const saved = await request.put(
    `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
    {
      data: { document: doc, revision: doc.metadata.revision },
    },
  );
  expect(saved.ok()).toBeTruthy();
  return (await saved.json()) as ResumeDocument;
}

test("desk selects the most recently edited CV and shows real document covers", async ({
  page,
  request,
}) => {
  const older = await createDocument(request, "Earlier chapter");
  const latest = await createDocument(request, "Next chapter");
  const summaries = await (
    await request.get("http://127.0.0.1:8101/api/resumes")
  ).json();
  const selected = summaries
    .filter((r: { id: string }) =>
      [older.metadata.id, latest.metadata.id].includes(r.id),
    )
    .map((r: { id: string }) => ({
      ...r,
      updatedAt:
        r.id === latest.metadata.id
          ? "2026-10-05T10:00:00Z"
          : "2026-10-04T10:00:00Z",
    }))
    .reverse();
  await page.route("**/api/resumes?include_archived=false", (route) =>
    route.fulfill({ json: selected }),
  );
  await page.route("**/api/jobs", (route) => route.fulfill({ json: [] }));
  await page.goto("/");
  const feature = page.getByRole("region", { name: "Continue working" });
  await expect(
    feature.getByRole("heading", { name: "Next chapter", exact: true }),
  ).toBeVisible();
  await expect(
    feature.getByRole("link", { name: "Continue editing" }),
  ).toHaveAttribute("href", `/resumes/${latest.metadata.id}`);
  const paper = feature.frameLocator("iframe").locator(".cv-page");
  await expect(paper).toContainText("Alex Morgan");
  await expect(
    page.getByRole("region", { name: "Your documents" }),
  ).toContainText("Earlier chapter");
  await page.screenshot({
    path: "test-results/editorial-desk.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Continue editing" }).click();
  await expect(page.getByRole("textbox", { name: "Resume title" })).toHaveValue(
    "Next chapter",
  );
});

test("desk distinguishes connection errors from an empty workspace and supports retry", async ({
  page,
}) => {
  let failed = false;
  await page.route("**/api/resumes?include_archived=false", (route) => {
    if (!failed) {
      failed = true;
      return route.fulfill({
        status: 503,
        json: { detail: "Workspace temporarily unavailable" },
      });
    }
    return route.fulfill({ json: [] });
  });
  await page.route("**/api/jobs", (route) => route.fulfill({ json: [] }));
  await page.goto("/");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Workspace temporarily unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Every story starts somewhere." }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Every story starts somewhere." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create Your First Resume", exact: true }),
  ).toBeEnabled();
});

test("document selection and focus preserve the draft and respect unapplied source changes", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  const frame = page.frameLocator('iframe[title="Resume document preview"]');
  await frame
    .getByRole("button", { name: "Edit section: EXPERIENCE", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Work Experience 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await frame
    .getByRole("button", { name: "Edit section: Profile", exact: true })
    .press("Enter");
  await page
    .getByRole("textbox", { name: "First Name", exact: true })
    .fill("Draft Alex");
  await page
    .getByRole("button", { name: "Focus on document", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Document tools" }),
  ).toBeHidden();
  await expect(frame.locator(".cv-page")).toContainText("Draft Alex");
  await frame
    .getByRole("button", { name: "Edit section: SUMMARY", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Document tools" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Professional Summary", exact: true }),
  ).toHaveValue(doc.summary);
  await page.getByRole("button", { name: "Source", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Resume source" });
  await source.fill((await source.inputValue()) + "\n# Unapplied change");
  await expect(
    page.getByRole("button", { name: "Focus on document", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Content", exact: true }),
  ).toBeDisabled();
  await expect(
    frame.getByRole("button", { name: "Edit section: Profile", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(source).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save Draft", exact: true }),
  ).toBeDisabled();
});

test("mobile design and preview share the draft without horizontal page overflow", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByRole("textbox", { name: "First Name", exact: true })
    .fill("Mobile Alex");
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const frame = page.frameLocator('iframe[title="Resume document preview"]');
  await expect(frame.locator(".cv-page")).toContainText("Mobile Alex");
  await expect(
    page.getByRole("region", { name: "Document tools" }),
  ).toBeHidden();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/editorial-mobile-preview.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit content", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Design", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "First Name", exact: true }),
  ).toHaveValue("Mobile Alex");
  await page.getByRole("button", { name: "Türkçeye geç", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Önizleme", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Ad", exact: true }),
  ).toHaveValue("Mobile Alex");
});

test("education highlights can be added, edited, deleted, saved and recovered in the visual editor", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Education 0", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Education", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Institution / University", exact: true })
    .fill("Example University");
  await page
    .getByRole("textbox", { name: "Grade", exact: true })
    .fill("3.8 / 4.0");
  await page
    .getByRole("textbox", { name: "Location", exact: true })
    .fill("Ankara");
  await page
    .getByRole("button", { name: "Add highlight", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Education highlights 1", exact: true }),
  ).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(
    (await page.locator(".studio-ribbon").boundingBox())!.y,
  ).toBeGreaterThanOrEqual(64);
  await page
    .getByRole("textbox", { name: "Education highlights 1", exact: true })
    .fill("Thesis on accessible interfaces");
  await page
    .getByRole("button", { name: "Add highlight", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Education highlights 2", exact: true })
    .fill("A detail to remove");
  await page
    .getByRole("button", { name: "Add highlight", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Education highlights 3", exact: true })
    .fill("Exchange year in Berlin");
  await page
    .getByRole("button", { name: "Remove bullet 2", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Education highlights 2", exact: true }),
  ).toHaveValue("Exchange year in Berlin");
  await expect(
    page.getByRole("textbox", { name: "Education highlights 2", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("textbox", { name: "Education highlights 2", exact: true })
    .fill("Exchange year in Amsterdam");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(
    (await page.locator(".studio-ribbon").boundingBox())!.y,
  ).toBeGreaterThanOrEqual(64);
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(async () =>
      (
        await request.get(
          `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
        )
      ).json(),
    )
    .toMatchObject({
      education: [
        {
          institution: "Example University",
          grade: "3.8 / 4.0",
          location: "Ankara",
          highlights: [
            "Thesis on accessible interfaces",
            "Exchange year in Amsterdam",
          ],
        },
      ],
    });
  await page.reload();
  await page.getByRole("button", { name: "Education 1", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Education highlights 2", exact: true }),
  ).toHaveValue("Exchange year in Amsterdam");
  await expect(
    page
      .frameLocator('iframe[title="Resume document preview"]')
      .locator(".cv-page"),
  ).toContainText("Thesis on accessible interfaces");
});

test("project bullets, dates and technology lists persist without rewriting typed separators", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Projects 0", exact: true }).click();
  await page.getByRole("button", { name: "Add Project", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Project Name", exact: true })
    .fill("Accessible editor");
  await page
    .getByRole("textbox", { name: "Start date", exact: true })
    .fill("2024-01");
  await page
    .getByRole("textbox", { name: "End date", exact: true })
    .fill("2024-09");
  await page
    .getByRole("textbox", { name: "Project achievements 1", exact: true })
    .fill("A detail to remove");
  await page.getByRole("button", { name: "Add Bullet", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Project achievements 2", exact: true })
    .fill("Built keyboard-accessible editing tools");
  await page
    .getByRole("button", { name: "Remove bullet 1", exact: true })
    .click();
  const bullet = page.getByRole("textbox", {
    name: "Project achievements 1",
    exact: true,
  });
  await expect(bullet).toHaveValue("Built keyboard-accessible editing tools");
  await bullet.fill("Built accessible editing tools for three teams");
  const technologies = page.getByRole("textbox", {
    name: "Technologies (comma-separated)",
    exact: true,
  });
  await technologies.pressSequentially("FastAPI, Redis");
  await expect(technologies).toHaveValue("FastAPI, Redis");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(async () =>
      (
        await request.get(
          `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
        )
      ).json(),
    )
    .toMatchObject({
      projects: [
        {
          name: "Accessible editor",
          startDate: "2024-01",
          endDate: "2024-09",
          technologies: ["FastAPI", "Redis"],
          bullets: ["Built accessible editing tools for three teams"],
        },
      ],
    });
  await page.reload();
  await page.getByRole("button", { name: "Projects 1", exact: true }).click();
  await expect(bullet).toHaveValue(
    "Built accessible editing tools for three teams",
  );
  await expect(
    page
      .frameLocator('iframe[title="Resume document preview"]')
      .locator(".cv-page"),
  ).toContainText("Built accessible editing tools for three teams");
});

test("touch controls and selected sections stay separated in Turkish at narrow widths", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Projects 0", exact: true }).click();
  await page.getByRole("button", { name: "Add Project", exact: true }).click();
  await page.getByRole("button", { name: "Türkçeye geç", exact: true }).click();
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const header = page.locator(".editor-entry-heading").first();
    const field = await header.locator(".editor-field").boundingBox();
    const remove = await header.getByRole("button").boundingBox();
    expect(field!.x + field!.width).toBeLessThan(remove!.x);
    if (width < 900) expect(remove!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const buttons = await page.locator(".studio-outline button").all();
    const boxes = await Promise.all(
      buttons.map((button) => button.boundingBox()),
    );
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!,
          b = boxes[j]!;
        expect(
          a.x + a.width <= b.x + 1 ||
            b.x + b.width <= a.x + 1 ||
            a.y + a.height <= b.y + 1 ||
            b.y + b.height <= a.y + 1,
        ).toBeTruthy();
      }
  }
  await expect(page.locator(".editor-entry").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/editorial-project-controls.png",
    fullPage: true,
  });
});

test("skill groups can be edited as lists and removed without fabricated default values", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByRole("button", { name: "Skill Groups 0", exact: true })
    .click();
  await page.getByRole("button", { name: "Add Category", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Skill category", exact: true })
    .fill("Backend");
  const skills = page.getByRole("textbox", {
    name: "Skills (comma-separated)",
    exact: true,
  });
  await expect(skills).toHaveValue("");
  await skills.pressSequentially("Python, FastAPI, SQL");
  await expect(skills).toHaveValue("Python, FastAPI, SQL");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(async () =>
      (
        await request.get(
          `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
        )
      ).json(),
    )
    .toMatchObject({
      skills: [{ category: "Backend", skills: ["Python", "FastAPI", "SQL"] }],
    });
  await page
    .getByRole("button", { name: "Remove skill group 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(async () =>
      (
        await request.get(
          `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
        )
      ).json(),
    )
    .toMatchObject({ skills: [] });
});
