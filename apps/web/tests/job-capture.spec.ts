import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseJobCapture } from "../src/lib/job-capture";

const captureSource = readFileSync(
  resolve(process.cwd(), "../../extensions/job-capture/capture.js"),
  "utf8",
);
const popupSource = readFileSync(
  resolve(process.cwd(), "../../extensions/job-capture/popup.js"),
  "utf8",
);
const popupHTML = readFileSync(
  resolve(process.cwd(), "../../extensions/job-capture/popup.html"),
  "utf8",
);
const sample = {
  company: "Capture Example",
  position: "Backend Engineer",
  description: "Build Python services.",
  sourceUrl: "https://example.com/jobs/backend",
  location: "İzmir, Türkiye",
};
const hash = (value: unknown) =>
  "#job-import=" + encodeURIComponent(JSON.stringify(value));

test("captured text is bounded and cannot supply commands or credentials", () => {
  expect(parseJobCapture(hash(sample))).toEqual(sample);
  for (const value of [
    null,
    [],
    { ...sample, company: 5 },
    { ...sample, description: "" },
    { ...sample, description: "x".repeat(20001) },
    { ...sample, sourceUrl: "javascript:alert(1)" },
    { ...sample, sourceUrl: "https://user:secret@example.com" },
    { ...sample, location: 42 },
    { ...sample, location: "x".repeat(256) },
    { ...sample, location: "test\u0000" },
  ])
    expect(parseJobCapture(hash(value))).toBeNull();
  expect(parseJobCapture("#job-import=%ZZ")).toBeNull();
  expect(
    parseJobCapture(
      hash({ ...sample, status: "applied", linkedResumeId: "untrusted" }),
    ),
  ).toEqual(sample);
});

test("extension handoff only pre-fills a review form, clears the hash and requires saving", async ({
  page,
  request,
}) => {
  let saves = 0;
  await page.route("**/api/jobs", async (route) => {
    if (route.request().method() === "POST") saves++;
    await route.continue();
  });
  await page.goto("/jobs" + hash(sample));
  const form = page.locator(".job-create-form");
  await expect(form).toBeVisible();
  await expect(
    form.getByPlaceholder("e.g. Stripe, Linear, Vercel"),
  ).toHaveValue(sample.company);
  await expect(page).toHaveURL(/\/jobs$/);
  expect(saves).toBe(0);
  await form
    .getByRole("button", { name: "Save & Analyze", exact: true })
    .click();
  await expect(form).not.toBeVisible();
  expect(saves).toBe(1);
  const saved = (
    await (await request.get("http://127.0.0.1:8101/api/jobs")).json()
  ).find((j: { company: string }) => j.company === sample.company);
  expect(saved.description).toBe(sample.description);
  expect(saved.url).toBe(sample.sourceUrl);
  expect(saved.location).toBe(sample.location);
});

test("capture uses one structured job, excludes hidden/form content and never loads assets", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.setContent(
    `<script type="application/ld+json">${JSON.stringify({ "@type": "JobPosting", title: "Engineer", hiringOrganization: { name: "Example" }, description: '<p>Build APIs</p><img src="https://invalid.example/track"><script>SECRET SCRIPT</script>' }).replaceAll("</", "<\\/")}</script><p>Visible listing</p><p style="display:none">HIDDEN SECRET</p><input value="FORM SECRET"><textarea>TEXTAREA SECRET</textarea>`,
  );
  const result = await page.evaluate(captureSource);
  expect(result).toMatchObject({
    company: "Example",
    position: "Engineer",
    description: "Build APIs",
  });
  expect(requests).toEqual([]);
  await page.setContent(
    `<script type="application/ld+json">${JSON.stringify([
      { "@type": "JobPosting", title: "One", description: "First" },
      { "@type": "JobPosting", title: "Two", description: "Second" },
    ])}</script><p>Visible listing</p><p style="display:none">HIDDEN SECRET</p><input value="FORM SECRET"><textarea>TEXTAREA SECRET</textarea><div contenteditable="true">EDIT SECRET</div>`,
  );
  expect(await page.evaluate(captureSource)).toMatchObject({
    company: "",
    position: "",
    description: "Visible listing",
  });
});

test("non-LinkedIn pages retain safe selected text as a fallback", async ({
  page,
}) => {
  await page.route("https://example.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<nav>Unrelated navigation</nav><article><p id="selected">Selected requirements.</p><p>Other visible content.</p><textarea>Private note</textarea></article>',
    }),
  );
  await page.goto("https://example.com/jobs/engineer");
  await page.locator("#selected").evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  expect(await page.evaluate(captureSource)).toMatchObject({
    description: "Selected requirements.",
    sourceType: "selection",
  });
});

test("popup reads only after a click and transfers only reviewed fields to localhost", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { reads: 0, opens: [] as string[], closed: false };
    window.close = () => {
      state.closed = true;
    };
    Object.assign(window, {
      captureState: state,
      chrome: {
        tabs: {
          query: async () => [
            { id: 1, url: "https://example.com/jobs/backend" },
          ],
          create: async ({ url }: { url: string }) => {
            state.opens.push(url);
          },
        },
        scripting: {
          executeScript: async () => {
            state.reads++;
            return [
              {
                result: {
                  company: "Example",
                  position: "Engineer",
                  description: "Original text",
                  sourceUrl: "https://example.com/jobs/backend",
                },
              },
            ];
          },
        },
      },
    });
  });
  await page.goto("about:blank");
  await page.setContent(
    popupHTML
      .replace('<script src="popup.js"></script>', "")
      .replace('<link rel="stylesheet" href="popup.css">', ""),
  );
  await page.addScriptTag({ content: popupSource });
  const state = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            captureState: { reads: number; opens: string[] };
          }
        ).captureState,
    );
  expect((await state()).reads).toBe(0);
  await expect(
    page.getByRole("button", { name: "Send to App", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Capture Page", exact: true }).click();
  await page
    .getByLabel("Location (optional)", { exact: true })
    .fill("Istanbul / Remote");
  await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
    "Example",
  );
  await page
    .getByRole("textbox", { name: "Job Description *", exact: true })
    .fill("Reviewed original facts");
  await page.getByRole("button", { name: "Send to App", exact: true }).click();
  const final = await state();
  expect(final.reads).toBe(1);
  expect(final.opens).toHaveLength(1);
  const target = new URL(final.opens[0]);
  expect(target.origin).toBe("http://localhost:3000");
  expect(parseJobCapture(target.hash)?.description).toBe(
    "Reviewed original facts",
  );
  expect(parseJobCapture(target.hash)?.location).toBe("Istanbul / Remote");
});
