import { expect, test, APIRequestContext, Page } from "@playwright/test";
import {
  JobApplication,
  LibrarySnippet,
  ResumeDocument,
} from "../src/lib/types";

const apiBase = "http://127.0.0.1:8101/api";

test("library evidence controls remain readable in both themes on desktop and mobile", async ({
  page,
  request,
}) => {
  const { builder } = await prepare(page, request, ["Python", "Docker"]);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      for (const checkbox of await builder
        .locator('.library-builder-candidate input[type="checkbox"]')
        .all()) {
        const box = (await checkbox.boundingBox())!;
        expect(box.width).toBeLessThanOrEqual(24);
        expect(box.height).toBeLessThanOrEqual(24);
      }
      for (const text of await builder
        .locator(".library-builder-candidate > span")
        .all()) {
        expect((await text.boundingBox())!.width).toBeGreaterThan(100);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await builder.screenshot({
        path: `test-results/library-builder-${colorScheme}-${width}.png`,
        style: ".workspace-header { visibility: hidden; }",
      });
    }
  }
});

async function prepare(
  page: Page,
  request: APIRequestContext,
  requirements: string[],
) {
  const jobResponse = await request.post(`${apiBase}/jobs`, {
    data: {
      position: "Backend library test",
      company: "Evidence company",
      description: "Backend development",
      requirements,
    },
  });
  expect(jobResponse.ok()).toBeTruthy();
  const job: JobApplication = await jobResponse.json();
  const snippets: LibrarySnippet[] = [];
  for (const data of [
    {
      title: "Python delivery",
      content: "Built Python APIs and reduced latency by 25%.",
      tags: ["Python"],
    },
    {
      title: "Goofy unrelated work",
      content: "Documented goofy experiments.",
      tags: ["Research"],
    },
    {
      title: "Docker rollout",
      content: "Deployed Docker containers with repeatable releases.",
      tags: ["Docker"],
    },
  ]) {
    const response = await request.post(`${apiBase}/library`, { data });
    expect(response.ok()).toBeTruthy();
    snippets.push(await response.json());
  }
  await page.route("**/api/library?*", (route) =>
    route.fulfill({ json: snippets }),
  );
  await page.route("**/api/jobs", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: [job] })
      : route.continue(),
  );
  await page.goto("/library");
  const builder = page.getByRole("region", {
    name: "Create a CV from the library",
  });
  await builder
    .getByRole("button", { name: "Create a CV from the library" })
    .click();
  await builder.getByLabel("Saved target job").selectOption(job.id);
  return { job, snippets, builder };
}

test("library draft copies only selected original facts and preserves library and job", async ({
  page,
  request,
}) => {
  const { builder, job, snippets } = await prepare(page, request, [
    "Python",
    "Docker",
    "Kubernetes",
  ]);
  await expect(
    builder.getByRole("checkbox", { name: /Python delivery/ }),
  ).not.toBeChecked();
  await builder.getByRole("button", { name: "Select text matches" }).click();
  await expect(
    builder.getByRole("checkbox", { name: /Python delivery/ }),
  ).toBeChecked();
  await expect(
    builder.getByRole("checkbox", { name: /Docker rollout/ }),
  ).toBeChecked();
  await expect(
    builder.getByRole("checkbox", { name: /Goofy unrelated/ }),
  ).not.toBeChecked();
  await builder.getByRole("checkbox", { name: /Docker rollout/ }).uncheck();
  await expect(builder).toContainText(
    "Not mentioned in selected evidence: Docker, Kubernetes",
  );
  await builder.getByLabel("First name", { exact: true }).fill("Ada");
  await builder.getByLabel("Last name", { exact: true }).fill("Example");
  await builder
    .getByLabel("Email (optional)", { exact: true })
    .fill("ada@example.test");
  await builder
    .getByRole("button", { name: "Create selected CV draft" })
    .click();
  const link = builder.getByRole("link", { name: "Open created CV" });
  await expect(link).toBeVisible();
  const id = (await link.getAttribute("href"))!.split("/").pop();
  const draft: ResumeDocument = await (
    await request.get(`${apiBase}/resumes/${id}`)
  ).json();
  expect(draft.profile.firstName).toBe("Ada");
  expect(draft.metadata.targetJob).toEqual({
    position: job.position,
    company: job.company,
    description: `${job.description}\n\n${job.requirements.join(", ")}`,
  });
  expect(draft.customSections[0].items.map((item) => item.description)).toEqual(
    [snippets[0].content],
  );
  expect(draft.experience).toEqual([]);
  expect(draft.skills).toEqual([]);
  expect(draft.education).toEqual([]);
  expect(await (await request.get(`${apiBase}/jobs/${job.id}`)).json()).toEqual(
    job,
  );
  expect(
    await (await request.get(`${apiBase}/library/${snippets[0].id}`)).json(),
  ).toEqual(snippets[0]);
  await expect(
    builder.getByRole("button", { name: "Create selected CV draft" }),
  ).toBeDisabled();
});

test("unmatched evidence stays optional and missing profile requires explicit deferral", async ({
  page,
  request,
}) => {
  const { builder } = await prepare(page, request, ["Go"]);
  await builder.getByRole("button", { name: "Select text matches" }).click();
  await expect(
    builder.getByRole("checkbox", { name: /Goofy unrelated/ }),
  ).not.toBeChecked();
  await expect(
    builder.getByRole("button", { name: "Create selected CV draft" }),
  ).toBeDisabled();
  await builder.getByRole("checkbox", { name: /Goofy unrelated/ }).check();
  await expect(
    builder.getByRole("button", { name: "Create selected CV draft" }),
  ).toBeDisabled();
  await builder
    .getByRole("checkbox", {
      name: "I will complete missing personal details in the editor.",
    })
    .check();
  await builder
    .getByRole("button", { name: "Create selected CV draft" })
    .click();
  const link = builder.getByRole("link", { name: "Open created CV" });
  await expect(link).toBeVisible();
  const id = (await link.getAttribute("href"))!.split("/").pop();
  const draft: ResumeDocument = await (
    await request.get(`${apiBase}/resumes/${id}`)
  ).json();
  expect(draft.profile.firstName).toBe("");
  expect(draft.profile.lastName).toBe("");
  expect(draft.customSections[0].items[0].description).toBe(
    "Documented goofy experiments.",
  );
  expect(draft.skills).toEqual([]);
});

test("failed job loading can be retried without creating a CV", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/jobs", (route) => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({
          status: 503,
          json: { error: { message: "Jobs unavailable" } },
        })
      : route.fulfill({ json: [] });
  });
  await page.goto("/library");
  const builder = page.getByRole("region", {
    name: "Create a CV from the library",
  });
  await builder
    .getByRole("button", { name: "Create a CV from the library" })
    .click();
  await expect(builder.getByRole("alert")).toContainText("Jobs unavailable");
  await builder.getByRole("button", { name: "Reload saved jobs" }).click();
  await expect(builder).toContainText(
    "Save a target job before creating a CV from the library.",
  );
  await expect(builder.getByRole("alert")).toHaveCount(0);
});
