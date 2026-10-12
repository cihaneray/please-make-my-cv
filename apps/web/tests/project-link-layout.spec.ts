import { expect, test } from "@playwright/test";

test("project links stay beside titles with dates at the right and long text wraps", async ({page, request}) => {
  const api = "http://127.0.0.1:8101/api";
  const document = await (await request.post(`${api}/resumes`, {data: {title: "Project header layout", initialData: {projects: [
    {name: "The Unnatural Leap", url: "https://store.steampowered.com/app/123/Game", urlLabel: "Steam Link", startDate: "2025", endDate: "2026"},
    {name: "A long project title ".repeat(12), url: "https://example.com/" + "longpath".repeat(30), startDate: "2025", endDate: "2026"},
    {name: "No link", startDate: "2025", endDate: "2026"},
  ]}}})).json();
  for (const template of ["classic", "minimal", "professional", "technical"]) {
    document.metadata.templateId = template;
    document.design.template = template;
    const html = await (await request.post(`${api}/resumes/${document.metadata.id}/preview`, {data:document})).text();
    await page.setContent(html);
    const first = page.locator(".project-header").first();
    const title = (await first.locator(".project-identity > span").boundingBox())!;
    const link = (await first.locator("a").boundingBox())!;
    const date = (await first.locator(".entry-dates").boundingBox())!;
    const header = (await first.boundingBox())!;
    expect(link.x - title.x - title.width).toBeGreaterThanOrEqual(8);
    expect(link.x - title.x - title.width).toBeLessThanOrEqual(12);
    expect(Math.abs(header.x + header.width - date.x - date.width)).toBeLessThan(2);
    for (const row of await page.locator(".project-header").all()) {
      const box = (await row.boundingBox())!;
      for (const item of await row.locator("a, .entry-dates").all()) {
        const bounds = (await item.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(box.x - 1);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(box.x + box.width + 1);
      }
    }
  }
});
