import { expect, test, APIRequestContext } from "@playwright/test";
import { ResumeDocument } from "../src/lib/types";

async function createResume(request: APIRequestContext) {
  const created = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "Skills layout" },
  });
  expect(created.ok()).toBeTruthy();
  const doc = (await created.json()) as ResumeDocument;
  doc.skills = [
    {
      id: "backend",
      category: "Backend",
      skills: ["Python", "FastAPI", "PostgreSQL", "Redis"],
    },
    { id: "frontend", category: "Frontend", skills: ["React", "CSS"] },
  ];
  const saved = await request.put(
    `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
    { data: { document: doc, revision: doc.metadata.revision } },
  );
  expect(saved.ok()).toBeTruthy();
  return (await saved.json()) as ResumeDocument;
}

test("skill category field and delete action stay separate when focused on desktop and mobile in both themes", async ({
  page,
  request,
}) => {
  const doc = await createResume(request);
  await page.goto(`/resumes/${doc.metadata.id}?section=skills`);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        localStorage.setItem("cv_workspace_theme", value);
      }, theme);
      await page.reload();
      await expect(page.locator("html")).toHaveClass(
        theme === "dark" ? /dark/ : /^(?!.*dark)/,
      );
      const entry = page.locator("#entry-backend");
      const category = entry.getByRole("textbox", {
        name: "Skill category",
        exact: true,
      });
      const remove = entry.getByRole("button", {
        name: "Remove skill group 1",
        exact: true,
      });
      await category.focus();
      await expect(category).toBeFocused();
      await expect(category).toHaveCSS("font-size", "12px");
      const layout = await page.evaluate(() => {
        const field = document.querySelector<HTMLInputElement>(
          "#entry-backend .editor-entry-heading input",
        )!;
        const deleteButton = document.querySelector<HTMLButtonElement>(
          "#entry-backend .editor-entry-heading .editor-icon-button",
        )!;
        const fieldBox = field.getBoundingClientRect();
        const deleteBox = deleteButton.getBoundingClientRect();
        const style = getComputedStyle(field);
        return {
          fieldRight: fieldBox.right,
          deleteLeft: deleteBox.left,
          outline: parseFloat(style.outlineWidth),
          offset: parseFloat(style.outlineOffset),
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      await expect(remove).toBeVisible();
      expect(
        layout.fieldRight + layout.outline + layout.offset + 2,
      ).toBeLessThan(layout.deleteLeft);
      expect(layout.scrollWidth).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: `test-results/skills-${theme}-${width}.png`,
      });
    }
  }
});

test("skill cards keep edits and fold state through reordering and search opens a matching card", async ({
  page,
  request,
}) => {
  const doc = await createResume(request);
  await page.goto(`/resumes/${doc.metadata.id}?section=skills`);
  const backend = page.locator("#entry-backend");
  const category = backend.getByRole("textbox", {
    name: "Skill category",
    exact: true,
  });
  await category.fill("Platform");
  const list = backend.getByRole("textbox", {
    name: "Skills (comma-separated)",
    exact: true,
  });
  await list.fill("Python, FastAPI, PostgreSQL, Redis, Kubernetes");
  await backend
    .getByRole("button", { name: "Collapse entry: Platform", exact: true })
    .click();
  await expect(category).toBeHidden();
  await expect(
    backend.getByRole("button", { name: /Expand entry: Platform/ }),
  ).toContainText("Skills: 5 · Python · FastAPI · PostgreSQL …");
  await page
    .locator("#entry-frontend")
    .getByRole("button", { name: "Move up: Frontend", exact: true })
    .click();
  await expect(
    backend.getByRole("button", { name: "Expand entry: Platform" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Projects 0", exact: true }).click();
  await page
    .getByRole("button", { name: "Skill Groups 2", exact: true })
    .click();
  await expect(
    backend.getByRole("button", { name: "Expand entry: Platform" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Search and commands" }).click();
  await page.getByLabel("Search CV or actions").fill("Kubernetes");
  await page
    .locator(".command-results button")
    .filter({ hasText: "Kubernetes" })
    .click();
  await expect(
    backend.getByRole("button", { name: "Collapse entry: Platform" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(list).toBeFocused();
  await expect(category).toHaveValue("Platform");
  await expect(list).toHaveValue(
    "Python, FastAPI, PostgreSQL, Redis, Kubernetes",
  );
  await page.getByRole("button", { name: "Add Category", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Collapse entry: Untitled skill group",
      exact: true,
    }),
  ).toHaveAttribute("aria-expanded", "true");
});
