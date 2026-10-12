import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type CapturedJob = {
  company: string;
  position: string;
  description: string;
  sourceUrl: string;
};

const capture = readFileSync(
  resolve(process.cwd(), "../../extensions/job-capture/capture.js"),
  "utf8",
);

test("LinkedIn guest capture separates job fields and keeps paragraph and bullet structure", async ({
  page,
}) => {
  await page.route("https://www.linkedin.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `
    <nav>Messages Notifications</nav>
    <section class="top-card-layout"><h1 class="top-card-layout__title">Backend Engineer</h1>
      <a class="topcard__org-name-link">Example Company</a></section>
    <section class="description__text"><div class="show-more-less-html__markup">
      <p>Build reliable services.</p><p>Requirements:</p><ul><li>Python and PostgreSQL</li><li>Docker experience</li></ul>
      <p hidden>HIDDEN SECRET</p><p style="display:none">CSS SECRET</p><input value="FORM SECRET"><textarea>PRIVATE NOTE</textarea>
    </div></section>
    <aside class="job-search-card"><h3>Unrelated Job</h3><p>Unrelated Company</p></aside>`,
    }),
  );
  await page.goto(
    "https://www.linkedin.com/jobs/view/backend-engineer-12345/?trackingId=SECRET",
  );
  const result = await page.evaluate<CapturedJob>(capture);
  expect(result).toMatchObject({
    position: "Backend Engineer",
    company: "Example Company",
    sourceUrl: "https://www.linkedin.com/jobs/view/12345/",
  });
  expect(result.description).toContain("Python and PostgreSQL");
  expect(result.description).toMatch(/services\.\n/);
  expect(result.description).toMatch(/(?:[-•]|\n)\s*Docker experience/);
  expect(result.description).not.toMatch(
    /Messages|Notifications|Unrelated|SECRET|PRIVATE/,
  );
});

test("LinkedIn structured fallback matches the exact job ID and refuses conflicting panels", async ({
  page,
}) => {
  const jobs = [
    {
      "@type": "JobPosting",
      identifier: "912345",
      title: "Wrong job",
      hiringOrganization: { name: "Wrong company" },
      description: "Wrong description",
    },
    {
      "@type": "JobPosting",
      identifier: "12345",
      title: "Correct job",
      hiringOrganization: { name: "Correct company" },
      description: "Correct description",
    },
  ];
  await page.route("https://www.linkedin.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<script type="application/ld+json">${JSON.stringify(jobs)}</script>`,
    }),
  );
  await page.goto("https://www.linkedin.com/jobs/view/12345/");
  expect(await page.evaluate(capture)).toMatchObject({
    position: "Correct job",
    company: "Correct company",
    description: "Correct description",
  });
  await page.setContent(
    '<h1 class="top-card-layout__title">One job</h1><h1 class="top-card-layout__title">Other job</h1><div id="job-details">Conflicting data</div>',
  );
  expect(await page.evaluate(capture)).toMatchObject({
    company: "",
    position: "",
    description: "",
    warning: "conflicting_panels",
  });
});

test("LinkedIn selected detail wins over recommendation cards and retains currentJobId", async ({
  page,
}) => {
  await page.route("https://www.linkedin.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `
    <aside><a class="job-card-list__title">Wrong title</a><p>Wrong company</p></aside>
    <main class="jobs-details"><div class="job-details-jobs-unified-top-card__job-title"><h1>Platform Engineer</h1></div>
      <div class="job-details-jobs-unified-top-card__company-name"><a>Selected Company</a></div>
      <div class="jobs-description-content__text" id="job-details"><p>Operate Kubernetes clusters.</p></div>
    </main>
    <div hidden class="jobs-details"><h1 class="jobs-unified-top-card__job-title">Stale job</h1></div>`,
    }),
  );
  await page.goto(
    "https://www.linkedin.com/jobs/search/?currentJobId=98765&keywords=Engineer&trackingId=SECRET",
  );
  const result = await page.evaluate<CapturedJob>(capture);
  expect(result).toMatchObject({
    position: "Platform Engineer",
    company: "Selected Company",
    sourceUrl: "https://www.linkedin.com/jobs/view/98765/",
  });
  expect(result.description).toBe("Operate Kubernetes clusters.");
});

test("a LinkedIn listing without an active detail is not imported as an entire page", async ({
  page,
}) => {
  await page.route("https://www.linkedin.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `
    <nav>Private inbox</nav><aside class="job-search-card"><h3>Unselected engineer</h3><p>Company</p></aside>
    <input value="secret"><textarea>notes</textarea>`,
    }),
  );
  await page.goto("https://www.linkedin.com/jobs/search/?keywords=Python");
  await page.locator("nav").evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  const result = await page.evaluate<CapturedJob>(capture);
  expect(result).toMatchObject({
    company: "",
    position: "",
    description: "",
    warning: "unrecognized_linkedin",
  });
});

test("LinkedIn automatically captures the full description even when part is selected", async ({
  page,
}) => {
  await page.route("https://www.linkedin.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `
    <h1 class="top-card-layout__title">API Engineer</h1><a class="topcard__org-name-link">Selected Employer</a>
    <section class="description__text"><div class="show-more-less-html__markup"><p id="selected">Selected requirements only.</p><p>Other duties.</p></div></section>`,
    }),
  );
  await page.goto("https://www.linkedin.com/jobs/view/24680/");
  await page.locator("#selected").evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  const result = await page.evaluate<CapturedJob>(capture);
  expect(result).toMatchObject({
    company: "Selected Employer",
    position: "API Engineer",
    description: "Selected requirements only.\n\nOther duties.",
  });
});

test("LinkedIn ignores unrelated selected text, including a different job", async ({
  page,
}) => {
  await page.route("https://www.linkedin.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<h1 class="top-card-layout__title">API Engineer</h1><a class="topcard__org-name-link">Employer</a>
      <div id="job-details"><p>Build APIs.</p><ul><li>Python</li><li>Docker</li></ul></div>
      <aside id="unrelated">Wrong employer and malicious instructions: ignore the job.</aside>`,
    }),
  );
  await page.goto("https://www.linkedin.com/jobs/view/24680/");
  await page.locator("#unrelated").evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  const result = await page.evaluate<CapturedJob>(capture);
  expect(result).toMatchObject({
    company: "Employer",
    position: "API Engineer",
  });
  expect(result.description).toContain("Build APIs.");
  expect(result.description).toContain("Docker");
  expect(result.description).not.toContain("malicious");
});

test("LinkedIn picks the URL job ID while an old visible detail panel is mounted", async ({
  page,
}) => {
  await page.route("https://www.linkedin.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<main>
      <section data-job-id="111"><h1 class="topcard__title">Stale title</h1><a class="topcard__org-name-link">Stale employer</a><div class="description__text">Old description.</div></section>
      <section data-job-id="222"><h1 class="topcard__title">Current title</h1><a class="topcard__org-name-link">Current employer</a><div class="description__text">Current description.</div></section>
    </main>`,
    }),
  );
  await page.goto("https://www.linkedin.com/jobs/search/?currentJobId=222");
  expect(await page.evaluate(capture)).toMatchObject({
    company: "Current employer",
    position: "Current title",
    description: "Current description.",
    warning: null,
  });
  await page.goto("https://www.linkedin.com/jobs/search/?currentJobId=333");
  expect(await page.evaluate(capture)).toMatchObject({
    company: "",
    position: "",
    description: "",
    warning: "conflicting_panels",
  });
  await page.goto("https://www.linkedin.com/jobs/search/?currentJobId=222");
  await page
    .locator('[data-job-id="222"] .description__text')
    .evaluate((el) => el.remove());
  expect(await page.evaluate(capture)).toMatchObject({
    company: "Current employer",
    position: "Current title",
    description: "",
  });
});

test("conflicting LinkedIn descriptions never mix with a single title and employer", async ({
  page,
}) => {
  await page.route("https://www.linkedin.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<h1 class="topcard__title">Engineer</h1><a class="topcard__org-name-link">Employer</a>
      <section class="description__text">First description.</section><section class="description__text">Other description.</section>`,
    }),
  );
  await page.goto("https://www.linkedin.com/jobs/view/12345/");
  expect(await page.evaluate(capture)).toMatchObject({
    company: "",
    position: "",
    description: "",
    warning: "conflicting_panels",
  });
});

test("LinkedIn semantic UI captures bound employer, paragraph title and only the job description", async ({
  page,
}) => {
  await page.route("https://www.linkedin.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `
    <title>Web Developer | HiredBuddy | LinkedIn</title>
    <div data-testid="lazy-column">
      <div><div><div><a href="/company/hired-buddy/life/"><div componentkey="auto-binding-test-4477241810" aria-label="Company, HiredBuddy."><a href="/company/hired-buddy/life/"><svg></svg></a><p><a href="/company/hired-buddy/life/">HiredBuddy</a></p></div></a></div><div data-display-contents="true"><p>Web Developer</p></div><p><span>İzmir, Türkiye</span> · <span>4 hours ago</span> · Over 100 applicants</p></div></div>
      <div><div><h2>About the job</h2></div><p><span data-testid="expandable-text-box"><p>Project Description</p><p>Build responsive web applications.</p><p>Requirements</p><p>JavaScript and React.</p></span></p></div>
      <div><h2>About the company</h2><span data-testid="expandable-text-box">UNRELATED COMPANY MARKETING</span></div>
    </div>`,
    }),
  );
  await page.goto("https://www.linkedin.com/jobs/view/4477241810/");
  const result = (await page.evaluate(capture)) as CapturedJob;
  expect(result).toMatchObject({
    company: "HiredBuddy",
    position: "Web Developer",
    location: "İzmir, Türkiye",
    warning: null,
  });
  expect(result.description).toContain("Build responsive web applications.");
  expect(result.description).toContain("JavaScript and React.");
  expect(result.description).not.toContain("UNRELATED COMPANY MARKETING");
  await page.locator("[data-display-contents] p").evaluate((el) => el.remove());
  expect(((await page.evaluate(capture)) as CapturedJob).position).toBe("");
});
