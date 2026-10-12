import { test, expect } from "@playwright/test";
const API = "http://127.0.0.1:8101/api";
async function setup(request: import("@playwright/test").APIRequestContext) {
  let root = await (await request.post(API + "/resumes", { data: { title: "Family source" } })).json();
  root.summary = "Built APIs.";
  root.experience = [{ id: "job-one", company: "Example", position: "Engineer", location: "", startDate: "2020-01",
    endDate: "", current: true, summary: "", bullets: ["Built APIs."], technologies: ["Python"] }];
  root = await (await request.put(API + "/resumes/" + root.metadata.id, { data: { revision: root.metadata.revision, document: root } })).json();
  const copy = await (await request.post(API + "/resumes/" + root.metadata.id + "/duplicate", { params: { title: "Tailored CV" } })).json();
  copy.experience[0].bullets = ["Python-focused evidence."];
  await request.put(API + "/resumes/" + copy.metadata.id, { data: { revision: copy.metadata.revision, document: copy } });
  root.experience[0].startDate = "2019-01";
  root.experience[0].bullets = ["Built reliable APIs."];
  root = await (await request.put(API + "/resumes/" + root.metadata.id, { data: { revision: root.metadata.revision, document: root } })).json();
  return { root, copy };
}

test("family updates are explicit, protect tailored wording and display comparable facts in Turkish", async ({ page, request }, testInfo) => {
  const { root, copy } = await setup(request);
  await page.goto("/resumes/" + root.metadata.id);
  await page.getByRole("button", { name: "Türkçeye geç", exact: true }).click();
  await page.getByRole("button", { name: "CV ailesi", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "CV ailesi", exact: true });
  const variant = dialog.getByRole("region", { name: "Tailored CV", exact: true });
  const date = variant.getByRole("checkbox", { name: /Başlangıç tarihi/ });
  await expect(date).not.toBeChecked();
  await expect(variant.getByRole("checkbox", { name: /Başarı maddeleri/ })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: /Seçilen değişiklikleri uygula/ })).toBeDisabled();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: "dark" });
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`family-${width}.png`) });
  }
  await date.check();
  await dialog.getByRole("button", { name: /Seçilen değişiklikleri uygula/ }).click();
  await expect(dialog.getByText(/^1 CV güncellendi/)).toBeVisible();
  const updated = await (await request.get(API + "/resumes/" + copy.metadata.id)).json();
  expect(updated.experience[0].startDate).toBe("2019-01");
  expect(updated.experience[0].bullets).toEqual(["Python-focused evidence."]);
  expect(await (await request.get(API + "/resumes/" + root.metadata.id)).json()).toEqual(root);
  updated.experience[0].position = "Senior Engineer";
  await request.put(API + "/resumes/" + updated.metadata.id, { data: { revision: updated.metadata.revision, document: updated } });
  await dialog.getByRole("button", { name: /Tutarlılık/ }).click();
  await dialog.getByRole("button", { name: "Önizlemeyi yenile", exact: true }).click();
  await expect(dialog.getByText("İş deneyimi · Unvan", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Kaydı kontrol et", exact: true })).toHaveAttribute("href", `/resumes/${copy.metadata.id}?section=experience&entry=job-one`);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "CV ailesi", exact: true })).toBeFocused();
});

test("family uses saved source and stale copies cannot partially update a batch", async ({ page, request }) => {
  const { root, copy } = await setup(request);
  const other = await (await request.post(API + "/resumes/" + root.metadata.id + "/duplicate", { params: { title: "Other CV" } })).json();
  root.summary = "Changed source.";
  const saved = await (await request.put(API + "/resumes/" + root.metadata.id, { data: { revision: root.metadata.revision, document: root } })).json();
  await page.goto("/resumes/" + saved.metadata.id);
  await page.getByRole("button", { name: "CV family", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "CV family", exact: true });
  const first = dialog.getByRole("region", { name: "Tailored CV", exact: true });
  const second = dialog.getByRole("region", { name: "Other CV", exact: true });
  await first.getByRole("checkbox", { name: /summary/ }).check();
  await second.getByRole("checkbox", { name: /summary/ }).check();
  const before = await (await request.get(API + "/resumes/" + copy.metadata.id)).json();
  other.profile.headline = "An independent edit";
  await request.put(API + "/resumes/" + other.metadata.id, { data: { revision: other.metadata.revision, document: other } });
  await dialog.getByRole("button", { name: /Apply selected changes/ }).click();
  await expect(dialog.getByRole("alert")).toContainText("Refresh the preview");
  expect(await (await request.get(API + "/resumes/" + copy.metadata.id)).json()).toEqual(before);
  await dialog.getByRole("button", { name: "Close CV family", exact: true }).click();
  await page.getByRole("button", { name: "Professional Summary", exact: true }).click();
  await page.getByRole("textbox", { name: "Professional Summary", exact: true }).fill("Unsaved input.");
  await page.getByRole("button", { name: "CV family", exact: true }).click();
  await expect(dialog.getByText("You have unsaved edits. Save the draft and refresh this preview before applying updates.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Apply selected changes/ })).toBeDisabled();
});
