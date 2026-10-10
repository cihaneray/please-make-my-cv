import { test, expect, APIRequestContext } from "@playwright/test";

async function fixture(request: APIRequestContext) {
  const created = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "Reading map fixture" },
  });
  expect(created.ok()).toBeTruthy();
  const doc = await created.json();
  doc.profile.firstName = "Layout";
  doc.profile.lastName = "Fixture";
  doc.summary = "A concise opening summary.";
  doc.experience = [
    {
      id: "map-role",
      company: "Example",
      position: "Engineer",
      location: "",
      startDate: "2020",
      endDate: "",
      current: true,
      summary: "",
      technologies: [],
      bullets: Array.from(
        { length: 30 },
        (_, i) =>
          `Achievement ${i + 1}: Built accessible workflows and documented measurable outcomes for teams.`,
      ),
    },
  ];
  const saved = await request.put(
    `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
    { data: { document: doc, revision: doc.metadata.revision } },
  );
  expect(saved.ok()).toBeTruthy();
  return saved.json();
}

test("reading map uses live DOM geometry and keeps CV and export content unchanged", async ({
  page,
  request,
}) => {
  const doc = await fixture(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  const toggle = page.getByTestId("reading-map-toggle");
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("reading-map-overlay")).toHaveCount(0);
  const frame = page.frameLocator('iframe[title="Resume document preview"]');
  const before = await frame.locator(".cv-page").evaluate((el) => el.outerHTML);
  const srcdoc = await page
    .locator('iframe[title="Resume document preview"]')
    .getAttribute("srcdoc");
  await toggle.click();
  await expect(page.getByTestId("reading-map-legend")).toContainText(
    "not real eye tracking",
  );
  await expect(page.getByTestId("reading-map-region").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/reading-map-desktop.png",
    fullPage: true,
  });
  const geometry = await frame.locator(".cv-page > header").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  });
  const actual = await page
    .getByTestId("reading-map-region")
    .first()
    .evaluate((el) => {
      const e = el as HTMLElement;
      return {
        top: parseFloat(e.style.top),
        left: parseFloat(e.style.left),
        width: parseFloat(e.style.width),
        height: parseFloat(e.style.height),
      };
    });
  const scale = actual.width / geometry.width;
  expect(actual.top).toBeCloseTo(geometry.top * scale, 1);
  expect(actual.left).toBeCloseTo(geometry.left * scale, 1);
  expect(actual.height).toBeCloseTo(geometry.height * scale, 1);
  expect(await frame.locator(".cv-page").evaluate((el) => el.outerHTML)).toBe(
    before,
  );
  expect(
    await page
      .locator('iframe[title="Resume document preview"]')
      .getAttribute("srcdoc"),
  ).toBe(srcdoc);
  await page.getByLabel("Preview zoom").selectOption("0.75");
  await expect
    .poll(async () =>
      page
        .getByTestId("reading-map-region")
        .first()
        .evaluate((el) => parseFloat((el as HTMLElement).style.width)),
    )
    .toBeCloseTo(geometry.width * 0.75, 1);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("reading-map-overlay")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  const wordRequest = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().endsWith("/export?format=docx"),
  );
  const wordDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await page.getByRole("menuitem", { name: /Word/ }).click();
  expect((await wordRequest).postDataJSON()).toEqual(doc);
  expect(await (await wordDownload).failure()).toBeNull();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const exportRequest = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().endsWith("/export"),
  );
  await page
    .getByRole("button", { name: "Exact PDF pages", exact: true })
    .click();
  expect((await exportRequest).postDataJSON()).toEqual(doc);
  await expect(
    page.locator('iframe[title="Resume document preview"]'),
  ).toHaveAttribute("src", /blob:/);
  await expect(page.getByTestId("reading-map-overlay")).toHaveCount(0);
  await expect(toggle).toBeDisabled();
  expect(
    await (
      await request.get(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`)
    ).json(),
  ).toEqual(doc);
});

test("reading map remains readable on mobile dark mode and turns off for pending source", async ({
  page,
  request,
}) => {
  const doc = await fixture(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto(`/resumes/${doc.metadata.id}`);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const toggle = page.getByTestId("reading-map-toggle");
  await expect(toggle).toBeEnabled();
  await toggle.click();
  const legend = page.getByTestId("reading-map-legend");
  await expect(legend).toBeVisible();
  const bounds = await legend.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: "test-results/reading-map-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit content", exact: true }).click();
  await page.getByRole("button", { name: "Source", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Resume source" });
  await expect(source).not.toHaveValue("");
  await source.fill((await source.inputValue()) + "\n# unapplied edit");
  await expect(toggle).toBeDisabled();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("reading-map-overlay")).toHaveCount(0);
});

test("reading map does not label the previous layout while a new preview is pending", async ({
  page,
  request,
}) => {
  const doc = await fixture(request);
  await page.goto(`/resumes/${doc.metadata.id}`);
  const toggle = page.getByTestId("reading-map-toggle");
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(page.getByTestId("reading-map-overlay")).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/resumes/${doc.metadata.id}/preview`, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page
      .getByRole("textbox", { name: "First Name", exact: true })
      .fill("New layout draft");
    await expect(toggle).toBeDisabled();
    await expect(page.getByTestId("reading-map-overlay")).toHaveCount(0);
  } finally {
    release();
  }
  await expect(toggle).toBeEnabled();
  await expect(page.getByTestId("reading-map-overlay")).toBeVisible();
  expect(
    await (
      await request.get(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`)
    ).json(),
  ).toEqual(doc);
});
