import { test, expect } from "@playwright/test";
import { selectMenu } from "./helpers/select-menu";

const backend = "http://127.0.0.1:8101/api";

test("projects and certifications retain structured details and enter job-specific CV sections", async ({
  page,
  request,
}) => {
  const job = await (
    await request.post(`${backend}/jobs`, {
      data: {
        company: "Structured Example",
        position: "Backend Engineer",
        description: "Python and AWS",
        requirements: ["Python", "AWS"],
      },
    })
  ).json();
  await page.goto("/library");
  await page.getByRole("button", { name: "Add Snippet", exact: true }).click();
  let form = page.locator("#library-snippet-form");
  await selectMenu(
    form.getByRole("combobox", { name: "Content type" }),
    "project",
  );
  await form
    .getByLabel("Snippet title", { exact: true })
    .fill("Python structured project");
  await form
    .getByLabel("Project accomplishments (one per line)")
    .fill("Built Python APIs\nDeployed verified endpoints");
  await form
    .getByLabel("Project URL", { exact: true })
    .fill("https://example.com/long/project/path");
  await form.getByLabel("Link text", { exact: true }).fill("Demo");
  await form.getByLabel("Start date", { exact: true }).fill("2024-01");
  await form.getByLabel("Technologies", { exact: true }).fill("Python, Docker");
  await form.getByRole("button", { name: "Save Snippet", exact: true }).click();
  await expect(form).toHaveCount(0);
  await page.getByRole("button", { name: "Add Snippet", exact: true }).click();
  form = page.locator("#library-snippet-form");
  await selectMenu(
    form.getByRole("combobox", { name: "Content type" }),
    "certification",
  );
  await form
    .getByLabel("Snippet title", { exact: true })
    .fill("AWS structured certification");
  await form.getByLabel("Issuer", { exact: true }).fill("AWS");
  await form.getByLabel("Issue date", { exact: true }).fill("2025-03");
  await form
    .getByLabel("Credential URL", { exact: true })
    .fill("https://example.com/verify");
  await form.getByRole("button", { name: "Save Snippet", exact: true }).click();
  await expect(form).toHaveCount(0);
  const builder = page.locator(".library-resume-builder");
  await builder
    .getByRole("button", { name: "Create a CV from the library", exact: true })
    .click();
  await selectMenu(builder.getByRole("combobox"), job.id);
  await builder
    .getByRole("checkbox", { name: /Python structured project/ })
    .check();
  await builder
    .getByRole("checkbox", { name: /AWS structured certification/ })
    .check();
  await builder.getByLabel("First name", { exact: true }).fill("Ada");
  await builder.getByLabel("Last name", { exact: true }).fill("Lovelace");
  await builder
    .getByRole("button", { name: "Create selected CV draft", exact: true })
    .click();
  const link = builder.getByRole("link", {
    name: "Open created CV",
    exact: true,
  });
  await expect(link).toBeVisible();
  const id = (await link.getAttribute("href"))!.split("/").pop();
  const cv = await (await request.get(`${backend}/resumes/${id}`)).json();
  expect(cv.projects).toContainEqual(
    expect.objectContaining({
      name: "Python structured project",
      urlLabel: "Demo",
      startDate: "2024-01",
      technologies: ["Python", "Docker"],
    }),
  );
  expect(cv.certifications).toContainEqual(
    expect.objectContaining({
      name: "AWS structured certification",
      issuer: "AWS",
      issueDate: "2025-03",
    }),
  );
  expect(cv.customSections).toEqual([]);
  expect(cv.metadata.targetJob.company).toBe("Structured Example");
});

test("project link labels can be edited while keeping the original destination", async ({
  page,
  request,
}) => {
  const response = await request.post(`${backend}/resumes`, {
    data: {
      title: "Short project links",
      initialData: {
        projects: [
          {
            name: "Steam game",
            url: "https://store.steampowered.com/app/123/Long_Game_Name",
            bullets: ["Built multiplayer gameplay"],
          },
        ],
      },
    },
  });
  const cv = await response.json();
  await page.goto(`/resumes/${cv.metadata.id}`);
  await page.getByRole("button", { name: /^Projects/, exact: false }).click();
  await page
    .getByLabel("Link text (optional)", { exact: true })
    .fill("View on Steam");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(`${backend}/resumes/${cv.metadata.id}`)
          ).json()
        ).projects[0].urlLabel,
    )
    .toBe("View on Steam");
  const preview = await request.post(
    `${backend}/resumes/${cv.metadata.id}/preview`,
    {
      data: await (
        await request.get(`${backend}/resumes/${cv.metadata.id}`)
      ).json(),
    },
  );
  const html = await preview.text();
  expect(html).toContain(">View on Steam</a>");
  expect(html).toContain(
    'href="https://store.steampowered.com/app/123/Long_Game_Name"',
  );
});
