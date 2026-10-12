import { test, expect } from "@playwright/test";

const API = "http://127.0.0.1:8101/api";

test("document shelf aligns long and short titles without overflowing", async ({ page, request }) => {
  const titles = ["Short CV", "A substantially longer curriculum vitae title with multiple employers and a target role and language variant", "Medium CV title"];
  const ids: string[] = [];
  for (const title of titles) {
    const response = await request.post(API + "/resumes", { data: { title } });
    expect(response.ok()).toBeTruthy();
    ids.push((await response.json()).metadata.id);
  }
  const summaries = await (await request.get(API + "/resumes")).json();
  await page.route("**/api/resumes?include_archived=false", route => route.fulfill({ json: summaries.filter((r: { id: string }) => ids.includes(r.id)) }));
  await page.route("**/api/jobs", route => route.fulfill({ json: [] }));
  await page.goto("/");
  const cards = page.locator(".shelf-document");
  await expect(cards).toHaveCount(3);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ colorScheme: "dark" });
    const geometry = await cards.evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return {
        top: box.top,
        title: node.querySelector("h3")!.getBoundingClientRect().top,
        role: node.querySelector("p")!.getBoundingClientRect().top,
        date: node.querySelector(":scope > span")!.getBoundingClientRect().top,
      };
    }));
    for (const a of geometry) for (const b of geometry) {
      if (Math.abs(a.top - b.top) < 1) {
        expect(Math.abs(a.title - b.title)).toBeLessThan(1);
        expect(Math.abs(a.role - b.role)).toBeLessThan(1);
        expect(Math.abs(a.date - b.date)).toBeLessThan(1);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/shelf-alignment-${width}.png`, fullPage: true });
  }
  await expect(cards.filter({ hasText: titles[1] }).locator("h3")).toHaveAttribute("title", titles[1]);
});

test("collapsed jobs and internship bullets can be reordered and saved", async ({ page, request }) => {
  const doc = await (await request.post(API + "/resumes", { data: { title: "Reordering CV" } })).json();
  doc.experience = ["Intern", "Engineer"].map((position, index) => ({
    id: `job-${index}`, company: "Example", position, location: "", startDate: "2020-01", endDate: "", current: true,
    summary: "", technologies: [], bullets: ["First achievement", "Second achievement"],
  }));
  expect((await request.put(API + "/resumes/" + doc.metadata.id, { data: { revision: doc.metadata.revision, document: doc } })).ok()).toBeTruthy();
  await page.goto(`/resumes/${doc.metadata.id}?section=experience`);
  const intern = page.locator("#entry-job-0");
  await intern.getByRole("button", { name: "Collapse entry: Intern", exact: true }).click();
  await intern.getByRole("button", { name: "Move down: Intern", exact: true }).click();
  await expect(page.locator('.editor-section [data-motion-id]').filter({ has: page.getByRole("button", { name: "Expand entry: Intern", exact: true }) })).toBeVisible();
  await intern.getByRole("button", { name: "Expand entry: Intern", exact: true }).click();
  await intern.getByRole("button", { name: "Move down: Achievements: 1", exact: true }).click();
  await expect(intern.locator(".bullet-text-field textarea").first()).toHaveValue("Second achievement");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect.poll(async () => {
    const saved = await (await request.get(API + "/resumes/" + doc.metadata.id)).json();
    return { ids: saved.experience.map((e: { id: string }) => e.id), bullets: saved.experience[1].bullets };
  }).toEqual({ ids: ["job-1", "job-0"], bullets: ["Second achievement", "First achievement"] });
  await page.getByRole("button", { name: "Design", exact: true }).click();
  const save = page.getByRole("button", { name: "Save Design Changes", exact: true });
  await expect(save).toBeVisible();
  expect((await save.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
