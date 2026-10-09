import { test, expect, APIRequestContext } from "@playwright/test";
import { ResumeDocument } from "../src/lib/types";
import { readFile } from "node:fs/promises";

test("job tailoring creates a copy from selected evidence and preserves the source", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request, "Tailoring original");
  doc.experience[0].bullets = [
    "Documented workflows.",
    "Built Python APIs with Docker.",
  ];
  await request.put(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`, {
    data: { document: doc, revision: doc.metadata.revision },
  });
  const original = await (
    await request.get(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`)
  ).json();
  const job = await (
    await request.post("http://127.0.0.1:8101/api/jobs", {
      data: {
        company: "Tailoring test",
        position: "Backend",
        linkedResumeId: doc.metadata.id,
        requirements: ["Python", "Docker", "Kubernetes"],
      },
    })
  ).json();
  await page.goto(`/jobs?selected=${job.id}`);
  const region = page.getByRole("region", { name: "Tailor CV to this job" });
  await region
    .getByRole("button", { name: "Suggest relevant bullets" })
    .click();
  await expect(region).toContainText("kubernetes");
  await expect(region.getByRole("checkbox")).toBeChecked();
  await region.getByRole("checkbox").uncheck();
  await expect(
    region.getByRole("button", { name: "Create tailored CV copy" }),
  ).toBeDisabled();
  await region.getByRole("checkbox").check();
  await region.getByRole("button", { name: "Create tailored CV copy" }).click();
  const link = region.getByRole("link", { name: "Open tailored CV" });
  await expect(link).toBeVisible();
  const id = (await link.getAttribute("href"))!.split("/").pop();
  const copy = await (
    await request.get(`http://127.0.0.1:8101/api/resumes/${id}`)
  ).json();
  expect(copy.experience[0].bullets).toEqual([
    "Built Python APIs with Docker.",
    "Documented workflows.",
  ]);
  expect(
    await (
      await request.get(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`)
    ).json(),
  ).toEqual(original);
});

test("password protected backups download encrypted data and restore with a password", async ({
  page,
}) => {
  await page.goto("/settings");
  const backupRegion = page.getByRole("region", {
    name: "Workspace backup and restore",
  });
  const password = page.getByLabel("Backup password (at least 12 characters)");
  await password.fill("short");
  const downloadButton = page.getByRole("button", {
    name: "Download workspace backup",
  });
  await expect(downloadButton).toBeDisabled();
  await password.fill("a-long-test-password");
  await page.getByLabel("Confirm backup password").fill("a-long-test-password");
  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "cv-workspace-backup.encrypted.json",
  );
  const path = (await download.path())!;
  const envelope = JSON.parse(await readFile(path, "utf8"));
  expect(envelope.format).toBe("cv-workspace-encrypted-v1");
  expect(envelope.resumes).toBeUndefined();
  await page
    .getByLabel("Restore password (encrypted backups only)")
    .fill("wrong-test-password");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Restore backup").setInputFiles(path);
  await expect(backupRegion.locator(".backup-status")).toContainText(
    "Incorrect backup password",
  );
  await page
    .getByLabel("Restore password (encrypted backups only)")
    .fill("a-long-test-password");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Restore backup").setInputFiles(path);
  await expect(backupRegion.locator(".backup-status")).toContainText(
    "Restored as new records",
  );
});

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
  const bullet = page.locator(".bullet-list-item").first();
  const textarea = await bullet.locator("textarea").boundingBox();
  const actions = await bullet.locator(".bullet-row-actions").boundingBox();
  expect(actions!.y).toBeGreaterThanOrEqual(textarea!.y + textarea!.height);
  expect(await bullet.locator(":scope > .reorder-controls").count()).toBe(0);

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
    const card = await page.locator(".editor-entry").first().boundingBox();
    const heading = await header.boundingBox();
    expect(heading!.y - card!.y).toBeLessThanOrEqual(20);
    const field = await header.locator(".editor-field > input").boundingBox();
    const remove = await header.getByRole("button").boundingBox();
    expect(field!.x + field!.width).toBeLessThan(remove!.x);
    expect(
      Math.abs(field!.y + field!.height / 2 - (remove!.y + remove!.height / 2)),
    ).toBeLessThanOrEqual(1);
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

test("live page guides follow document length and zoom, then disappear when content shrinks", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  const count = page.getByTestId("live-page-count");
  const guides = page.getByTestId("live-page-boundary");
  await expect(count).toHaveText("≈ 1 page");
  await expect(guides).toHaveCount(0);
  await page
    .getByRole("button", { name: "Professional Summary", exact: true })
    .click();
  const summary = page.getByRole("textbox", {
    name: "Professional Summary",
    exact: true,
  });
  await summary.fill(
    "Builds reliable software and accessible workflows for people and teams. ".repeat(
      160,
    ),
  );
  await expect.poll(() => guides.count()).toBeGreaterThan(0);
  const height = await page
    .frameLocator("iframe")
    .locator(".cv-page")
    .evaluate((el) => el.scrollHeight);
  const pages = Math.max(1, Math.ceil((height - 1) / ((297 * 96) / 25.4)));
  await expect(count).toHaveText(`≈ ${pages} pages`);
  await expect(guides).toHaveCount(pages - 1);
  await expect(guides.first()).toHaveText("Page 2");
  await page.getByLabel("Preview zoom").selectOption("0.75");
  const paper = await page.locator(".canvas-paper").boundingBox();
  const boundary = await guides.first().boundingBox();
  expect(boundary!.y - paper!.y).toBeCloseTo(((297 * 96) / 25.4) * 0.75, 0);
  await expect(count).toHaveText(`≈ ${pages} pages`);
  await expect(guides.first()).toHaveCSS("pointer-events", "none");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.getByLabel("Preview zoom").selectOption("fit");
  await expect(count).toHaveText(`≈ ${pages} pages`);
  const mobilePaper = await page.locator(".canvas-paper").boundingBox();
  const mobileGuide = await guides.first().boundingBox();
  expect(mobileGuide!.width).toBeLessThan(390);
  expect(mobileGuide!.y - mobilePaper!.y).toBeCloseTo(
    (mobilePaper!.width * 297) / 210,
    0,
  );
  await page.getByRole("button", { name: "Edit content", exact: true }).click();
  await summary.fill("A short professional summary.");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(count).toHaveText("≈ 1 page");
  await expect(guides).toHaveCount(0);
  await page
    .getByRole("button", { name: "Exact PDF pages", exact: true })
    .click();
  await expect(count).toHaveCount(0);
  await expect(guides).toHaveCount(0);
  await page.getByRole("button", { name: "Live content", exact: true }).click();
  await expect(count).toHaveText("≈ 1 page");
});

test("moving selections track routes and tabs, preserve drafts, and respect reduced motion", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  const rail = page.locator(".sliding-rail");
  await expect(rail).toHaveAttribute("data-ready", "true");
  await expect
    .poll(async () => {
      const selected = await page
        .locator('.workspace-rail [aria-current="page"]')
        .boundingBox();
      return Math.abs((await rail.boundingBox())!.y - selected!.y);
    })
    .toBeLessThan(1);
  const initial = await rail.boundingBox();
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("link", { name: "Target Jobs", exact: true })
    .click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect
    .poll(async () => (await rail.boundingBox())!.y)
    .toBeGreaterThan(initial!.y + 40);
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("link", { name: "Resumes", exact: true })
    .click();
  await expect(page).toHaveURL(/\/resumes$/);
  await expect
    .poll(async () => Math.abs((await rail.boundingBox())!.y - initial!.y))
    .toBeLessThan(1);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByRole("textbox", { name: "First Name", exact: true })
    .fill("Motion draft");
  const tab = page.locator(".sliding-tab");
  const contentBox = await tab.boundingBox();
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await expect
    .poll(async () => (await tab.boundingBox())!.x)
    .toBeGreaterThan(contentBox!.x + 30);
  await page
    .getByRole("button", { name: "Focus on document", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Document tools" }),
  ).toBeHidden();
  await expect(page.locator(".studio-inspector")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Show tools", exact: true }).click();
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "First Name", exact: true }),
  ).toHaveValue("Motion draft");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(rail).toHaveCSS("transition-duration", "0s");
  await expect(tab).toHaveCSS("transition-duration", "0s");
  await expect(page.locator(".workspace-page-transition")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.getByRole("button", { name: "Education 0", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Education", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove education 1", exact: true })
    .click();
  await expect(page.locator(".motion-list-ghost")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await expect
    .poll(async () => {
      const selected = await page
        .getByRole("button", { name: "Design", exact: true })
        .boundingBox();
      const indicator = await tab.boundingBox();
      return Math.abs(selected!.x - indicator!.x);
    })
    .toBeLessThan(1);
});

test("visual ordering persists, follows PDF section order and supports undo/redo", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  doc.experience[0].position = "First role";
  doc.experience[0].bullets = ["First detail", "Second detail"];
  doc.experience.push({
    ...doc.experience[0],
    id: "second-role",
    position: "Second role",
    bullets: ["Another fact"],
  });
  await request.put(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`, {
    data: { document: doc, revision: doc.metadata.revision },
  });
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByRole("button", { name: "Work Experience 2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move up: Second role", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Job Title", exact: true }).first(),
  ).toHaveValue("Second role");
  await page
    .getByRole("button", { name: "Undo last draft edit", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Job Title", exact: true }).first(),
  ).toHaveValue("First role");
  await page
    .getByRole("button", { name: "Redo last draft edit", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Job Title", exact: true }).first(),
  ).toHaveValue("Second role");
  const details = page
    .getByRole("group", { name: "Achievements:", exact: true })
    .nth(1);
  await details
    .getByRole("button", { name: "Move up: Achievements: 2", exact: true })
    .click();
  await expect(
    details.getByRole("textbox", { name: "Achievements: 1", exact: true }),
  ).toHaveValue("Second detail");
  await page
    .getByRole("button", { name: "Undo last draft edit", exact: true })
    .click();
  await expect(
    details.getByRole("textbox", { name: "Achievements: 1", exact: true }),
  ).toHaveValue("First detail");
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page
    .getByRole("button", { name: "Move up: Work Experience", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .frameLocator("iframe")
        .locator(".cv-page > section")
        .first()
        .getAttribute("data-studio-section"),
    )
    .toBe("experience");
  await page
    .getByRole("button", {
      name: "Drag to reorder: Professional Summary",
      exact: true,
    })
    .dragTo(
      page.getByRole("button", {
        name: "Drag to reorder: Work Experience",
        exact: true,
      }),
    );
  await expect
    .poll(() =>
      page
        .frameLocator("iframe")
        .locator(".cv-page > section")
        .first()
        .getAttribute("data-studio-section"),
    )
    .toBe("summary");
  await page
    .getByRole("button", { name: "Undo last draft edit", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .frameLocator("iframe")
        .locator(".cv-page > section")
        .first()
        .getAttribute("data-studio-section"),
    )
    .toBe("experience");

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
      design: {
        sectionOrder: [
          "experience",
          "summary",
          "education",
          "projects",
          "skills",
          "certifications",
          "languages",
          "customSections",
        ],
      },
      experience: [{ position: "Second role" }, { position: "First role" }],
    });
  await page.reload();
  await expect
    .poll(() =>
      page
        .frameLocator("iframe")
        .locator(".cv-page > section")
        .first()
        .getAttribute("data-studio-section"),
    )
    .toBe("experience");
});

test("typing history coalesces, deletion is recoverable, and redo cannot overwrite a new edit", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  const first = page.getByRole("textbox", { name: "First Name", exact: true });
  await first.fill("");
  await first.pressSequentially("Edited Alex");
  // Document history is explicit while text fields keep their native undo.
  await page
    .getByRole("button", { name: "Undo last draft edit", exact: true })
    .click();
  await expect(first).toHaveValue("Alex");
  await page
    .getByRole("button", { name: "Redo last draft edit", exact: true })
    .click();
  await expect(first).toHaveValue("Edited Alex");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(page.locator(".studio-status")).toContainText("Saved");
  await page
    .getByRole("button", { name: "Work Experience 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove experience 1", exact: true })
    .click();
  await expect(page.locator(".deletion-feedback")).toContainText(
    "Item removed.",
  );
  await page
    .locator(".deletion-feedback")
    .getByRole("button", { name: "Undo", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Job Title", exact: true }),
  ).toHaveValue("Designer");
  await page
    .getByRole("textbox", { name: "Job Title", exact: true })
    .fill("Senior designer");
  await expect(
    page.getByRole("button", { name: "Redo last draft edit", exact: true }),
  ).toBeDisabled();
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
      profile: { firstName: "Edited Alex" },
      experience: [{ position: "Senior designer" }],
    });
});

test("command search locates CV fields and quick actions work with the keyboard", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByRole("textbox", { name: "First Name", exact: true })
    .fill("Search draft");
  await page
    .getByRole("textbox", { name: "First Name", exact: true })
    .press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search and commands" });
  await expect(dialog).toBeVisible();
  const search = dialog.getByRole("textbox", { name: "Search CV or actions" });
  await search.fill("accessible editing");
  await search.press("Control+z");
  await search.fill("accessible editing");
  await search.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(
    page
      .locator(".studio-inspector textarea")
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (document.activeElement as HTMLTextAreaElement)?.value,
      ),
    )
    .toBe("Designed accessible editing workflows.");
  await page.getByRole("button", { name: "Search and commands" }).click();
  await search.fill("Add Project");
  await search.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("textbox", { name: "Project Name", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Personal Profile", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "First Name", exact: true }),
  ).toHaveValue("Search draft");
});

test("page fit proposals require approval and stale results cannot change the draft", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.route("**/api/resumes/*/page-fit", async (route) => {
    const source = route.request().postDataJSON().document;
    await route.fulfill({
      json: {
        currentPages: 3,
        targetPages: 2,
        suggestions: [],
        options: [
          {
            id: "margins",
            label: "Compact spacing and margins",
            pageCount: 2,
            design: {
              ...source.design,
              spacing: "compact",
              margins: "compact",
            },
          },
        ],
      },
    });
  });
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page
    .getByRole("button", { name: "Find layout suggestions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply layout", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Target page count", { exact: true }).selectOption("1");
  await expect(
    page.getByRole("button", { name: "Apply layout", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Target page count", { exact: true }).selectOption("2");
  expect(
    (
      await request.get(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`)
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await page
    .getByRole("textbox", { name: "First Name", exact: true })
    .fill("Changed draft");
  await page.getByRole("button", { name: "Design", exact: true }).click();
  // Reopening the helper clears its old report; no stale proposal survives.
  await expect(
    page.getByRole("button", { name: "Apply layout", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Find layout suggestions", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply layout", exact: true }).click();
  await page
    .getByRole("button", { name: "Undo last draft edit", exact: true })
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
    .toMatchObject({
      profile: { firstName: "Changed draft" },
      design: { margins: "normal" },
    });
});

test("job planning and editable cover letters persist across status changes and reloads", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  const response = await request.post("http://127.0.0.1:8101/api/jobs", {
    data: {
      company: "Workflow company",
      position: "Designer",
      linkedResumeId: doc.metadata.id,
      followUpDate: "2020-01-01",
    },
  });
  const job = await response.json();
  await page.goto("/jobs");
  await page.getByText("Workflow company", { exact: true }).first().click();
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate letter draft", exact: true })
    .click();
  const letter = page.getByRole("textbox", {
    name: "Letter text",
    exact: true,
  });
  await expect
    .poll(() => letter.inputValue())
    .toContain("Designed accessible editing workflows.");
  await letter.fill("Reviewed letter with my own wording");
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page
    .getByLabel("Interview date and time", { exact: true })
    .fill("2026-10-20T14:30");
  await page
    .getByRole("combobox", { name: "Application status" })
    .selectOption("interview");
  await page.getByRole("button", { name: "Save job", exact: true }).click();
  await expect
    .poll(async () =>
      (await request.get(`http://127.0.0.1:8101/api/jobs/${job.id}`)).json(),
    )
    .toMatchObject({
      status: "interview",
      interviewAt: "2026-10-20T14:30",
      coverLetter: "Reviewed letter with my own wording",
    });
  await page.reload();
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await expect(letter).toHaveValue("Reviewed letter with my own wording");
  await expect(page.locator(".job-agenda")).toContainText("Overdue");
});

test("application dossier preserves drafts between tabs and files, and presents submitted documents", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request, "Dossier CV");
  const other = await request.post("http://127.0.0.1:8101/api/jobs", {
    data: { company: "Dossier B", position: "Other role" },
  });
  expect(other.ok()).toBeTruthy();
  const response = await request.post("http://127.0.0.1:8101/api/jobs", {
    data: {
      company: "Dossier A",
      position: "Designer",
      linkedResumeId: doc.metadata.id,
      requirements: ["accessible"],
    },
  });
  const job = await response.json();
  await page.goto("/jobs");
  const index = page.getByRole("complementary", { name: "Application list" });
  await index.getByRole("button", { name: /Dossier A/ }).click();
  await page
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("A preserved note");
  await page
    .getByRole("tab", { name: "Overview", exact: true })
    .press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Job details", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("textbox", { name: "Position", exact: true })
    .fill("Tailored designer");
  await page
    .getByRole("tab", { name: "Job details", exact: true })
    .press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Documents", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("textbox", { name: "Letter text", exact: true })
    .fill("A letter draft");
  await expect(page.locator(".dossier-cv-cover iframe")).toBeVisible();
  await index.getByRole("button", { name: /Dossier B/ }).click();
  await index.getByRole("button", { name: /Dossier A/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Notes", exact: true }),
  ).toHaveValue("A preserved note");
  await page.getByRole("tab", { name: "Job details", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Position", exact: true }),
  ).toHaveValue("Tailored designer");
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Letter text", exact: true }),
  ).toHaveValue("A letter draft");
  await page.getByRole("button", { name: "Save job", exact: true }).click();
  await expect
    .poll(async () =>
      (await request.get(`http://127.0.0.1:8101/api/jobs/${job.id}`)).json(),
    )
    .toMatchObject({
      position: "Tailored designer",
      notes: "A preserved note",
      coverLetter: "A letter draft",
    });
  await page
    .getByRole("combobox", { name: "Application status", exact: true })
    .selectOption("applied");
  await expect
    .poll(async () =>
      (await request.get(`http://127.0.0.1:8101/api/jobs/${job.id}`)).json(),
    )
    .toMatchObject({ status: "applied" });
  await page
    .getByRole("button", { name: "Load submitted copies", exact: true })
    .click();
  await expect(page.locator(".submitted-copy-list")).toContainText(
    "Dossier CV",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(391);
  await expect(
    page.getByRole("button", { name: "Download submitted copy", exact: true }),
  ).toBeVisible();
});

test("evidence previews highlight terms, remember expansion and link to exact CV entries", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  const response = await request.post("http://127.0.0.1:8101/api/jobs", {
    data: {
      company: "Evidence file",
      position: "Designer",
      linkedResumeId: doc.metadata.id,
      requirements: ["accessible"],
    },
  });
  const job = await response.json();
  await page.route(`**/api/jobs/${job.id}/match/*`, (route) =>
    route.fulfill({
      json: {
        jobId: job.id,
        resumeId: doc.metadata.id,
        matchScore: 100,
        matchedSkills: ["accessible"],
        missingSkills: [],
        recommendedKeywords: [],
        sectionFeedback: [],
        summary: "Explicit evidence found.",
        evidence: [
          {
            requirement: "accessible",
            section: "experience",
            entryId: "editorial-experience",
            text: "Designed accessible editing workflows.",
          },
          {
            requirement: "accessible",
            section: "summary",
            entryId: null,
            text: "Builds accessible tools.",
          },
        ],
      },
    }),
  );
  await page.goto("/jobs");
  await page
    .getByRole("complementary", { name: "Application list" })
    .getByRole("button", { name: /Evidence file/ })
    .click();
  const card = page.locator(".evidence-card");
  await expect(card.locator(".evidence-preview")).toContainText(
    "Designed accessible editing workflows.",
  );
  await expect(card.locator(".evidence-preview mark")).toHaveText("accessible");
  await expect(card.locator(".evidence-preview small")).toHaveText(
    "Example Studio",
  );
  await card.locator("summary").click();
  await expect(card).toHaveAttribute("open", "");
  await expect(
    card.getByRole("link", { name: "Open in CV" }).first(),
  ).toHaveAttribute(
    "href",
    `/resumes/${doc.metadata.id}?section=experience&entry=editorial-experience`,
  );
  await page.getByRole("tab", { name: "Job details", exact: true }).click();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(card).toHaveAttribute("open", "");
  await page.reload();
  await expect(card).toHaveAttribute("open", "");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card.locator(".evidence-sources")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(391);
});

test("structured certification, language and custom cards save nested edits and ordering", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByRole("button", { name: "Certifications 0", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add Certifications", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Cloud Fundamentals");
  await page
    .getByRole("textbox", { name: "Issuer", exact: true })
    .fill("Example Academy");
  await page.getByRole("button", { name: "Languages 0", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Languages", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Language", exact: true })
    .fill("English");
  await page
    .getByRole("textbox", { name: "Proficiency", exact: true })
    .fill("B2");
  await page
    .getByRole("button", { name: "Custom sections 0", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add Custom Sections", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Volunteering");
  await page.getByRole("button", { name: "Add Items", exact: true }).click();
  const item = page.locator(".custom-entry-list .editor-entry").first();
  await item
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Mentor");
  await item
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Community support");
  await item.getByRole("button", { name: "Add Bullet", exact: true }).click();
  await item
    .getByRole("textbox", { name: "Bullets 1", exact: true })
    .fill("Coached five students.");
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
      certifications: [
        { name: "Cloud Fundamentals", issuer: "Example Academy" },
      ],
      languages: [{ language: "English", proficiency: "B2" }],
      customSections: [
        {
          title: "Volunteering",
          items: [
            {
              title: "Mentor",
              description: "Community support",
              bullets: ["Coached five students."],
            },
          ],
        },
      ],
    });
  await page.reload();
  await page.getByRole("button", { name: "Languages 1", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Languages", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Language", exact: true })
    .last()
    .fill("Turkish");
  await page
    .getByRole("button", { name: "Move up: Languages", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("textbox", { name: "Language", exact: true }).first(),
  ).toHaveValue("Turkish");
  await page
    .getByRole("button", { name: "Remove Languages 1", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Language", exact: true }),
  ).toHaveValue("English");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("application preparation reports saved evidence, actual PDF warnings and downloads an explicit package", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request, "Readiness CV");
  doc.profile.email = "";
  doc.summary = "TODO replace this summary";
  const saved = await request.put(
    `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
    { data: { document: doc, revision: doc.metadata.revision } },
  );
  expect(saved.ok()).toBeTruthy();
  const job = await (
    await request.post("http://127.0.0.1:8101/api/jobs", {
      data: {
        company: "Package Example",
        position: "Designer",
        linkedResumeId: doc.metadata.id,
        coverLetter: "Saved cover letter.",
      },
    })
  ).json();
  await page.route(`**/api/resumes/${doc.metadata.id}/pdf-check`, (route) =>
    route.fulfill({
      json: {
        pageCount: 2,
        issues: [
          {
            code: "horizontal-overflow",
            page: null,
            message:
              "Content extends beyond the A4 layout. Inspect the exact PDF pages.",
          },
        ],
      },
    }),
  );
  await page.goto("/jobs");
  await page
    .locator(".application-index-row")
    .filter({ hasText: "Package Example" })
    .click();
  const preparation = page.getByRole("region", {
    name: "Ready to apply",
    exact: true,
  });
  await preparation
    .getByRole("button", { name: "Check application", exact: true })
    .click();
  await expect(preparation.locator('[data-result="review"]')).toHaveCount(2);
  await expect(preparation).toContainText("Actual PDF: 2 pages");
  await expect(preparation).toContainText(
    "Content extends beyond the A4 layout",
  );
  const downloaded = page.waitForEvent("download");
  await preparation
    .getByRole("button", { name: "Download package", exact: true })
    .click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe(
    "Package-Example-Designer-application.zip",
  );
  await expect(preparation).toContainText("Package downloaded");
  await page
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("Unsaved note");
  await expect(
    preparation.getByRole("button", { name: "Check application", exact: true }),
  ).toBeDisabled();
  await expect(
    preparation.getByRole("button", { name: "Download package", exact: true }),
  ).toBeDisabled();
  await expect(preparation).toContainText("Save application edits");
  await page.getByRole("button", { name: "Save job", exact: true }).click();
  await expect(
    preparation.getByRole("button", { name: "Check application", exact: true }),
  ).toBeEnabled();
  await page.route(`**/api/resumes/${doc.metadata.id}/pdf-check`, (route) =>
    route.fulfill({
      status: 503,
      json: { detail: "PDF rendering unavailable" },
    }),
  );
  await preparation
    .getByRole("button", { name: "Check application", exact: true })
    .click();
  await expect(preparation).toContainText("PDF check incomplete");
  await expect(preparation.getByRole("alert")).toBeVisible();
  expect(
    (
      await request.get(`http://127.0.0.1:8101/api/jobs/${job.id}/snapshots`)
    ).ok(),
  ).toBeTruthy();
});

test("DOCX download uses the current form draft and blocks unapplied source edits", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request, "Word export");
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page
    .getByRole("textbox", { name: "First Name", exact: true })
    .fill("Unsaved Word name");
  const submitted = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().endsWith("/export?format=docx"),
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await page.getByRole("menuitem", { name: /Word/ }).click();
  expect((await submitted).postDataJSON().profile.firstName).toBe(
    "Unsaved Word name",
  );
  const file = await download;
  expect(file.suggestedFilename()).toBe("Word_export.docx");
  expect(await file.failure()).toBeNull();
  const saved = await (
    await request.get(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`)
  ).json();
  expect(saved.profile.firstName).toBe("Alex");
  await page.setViewportSize({ width: 390, height: 844 });
  const button = page.getByRole("button", {
    name: "Download",
    exact: true,
  });
  await expect(button).toBeVisible();
  const bounds = await button.boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  await page.getByRole("button", { name: "Source", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Resume source" });
  await source.fill((await source.inputValue()) + "\n# pending");
  await expect(button).toBeDisabled();
});

test("download menu supports keyboard dismissal, dark mode and narrow screens", async ({
  page,
  request,
}) => {
  const doc = await createDocument(request, "Download menu");
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  const trigger = page.getByRole("button", { name: "Download", exact: true });
  await trigger.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: /^PDF/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: /Word/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await trigger.click();
  await page.getByRole("textbox", { name: "First Name", exact: true }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Download format", exact: true });
  const bounds = await menu.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  await page.screenshot({ path: "test-results/download-menu-mobile.png" });
});
