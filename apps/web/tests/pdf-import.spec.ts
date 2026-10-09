import { test, expect } from "@playwright/test";

test("PDF CV is reviewed locally before explicit import and stale extraction is cleared", async ({
  page,
  request,
}) => {
  const created = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "PDF fixture" },
  });
  let doc = await created.json();
  doc.profile = {
    ...doc.profile,
    firstName: "Deniz",
    lastName: "Example",
    email: "deniz@example.com",
    phone: "+90 555 123 45 67",
  };
  doc.summary =
    "Backend engineer delivering reliable services with documented results and careful testing.";
  doc.experience = [
    {
      id: "pdf-exp",
      company: "Example Technology",
      position: "Developer",
      location: "",
      startDate: "2022-03",
      endDate: "",
      current: true,
      summary: "",
      bullets: ["Reduced API response time by 35 percent."],
      technologies: [],
    },
  ];
  doc.education = [
    {
      id: "pdf-edu",
      institution: "Example University",
      degree: "Computer Science",
      fieldOfStudy: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      grade: "",
      highlights: [],
    },
  ];
  doc.skills = [
    { id: "pdf-skills", category: "Backend", skills: ["Python", "PostgreSQL"] },
  ];
  doc.projects = [
    {
      id: "pdf-project",
      name: "Task queue",
      role: "",
      url: "",
      startDate: "",
      endDate: "",
      bullets: ["Built a reliable queue for background tasks."],
      technologies: [],
    },
  ];
  const pdf = await request.post(
    `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}/export?format=pdf`,
    { data: doc },
  );
  expect(pdf.ok()).toBeTruthy();
  const buffer = await pdf.body();
  const count = (
    await (await request.get("http://127.0.0.1:8101/api/resumes")).json()
  ).length;
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/import");
  await page
    .getByRole("button", { name: "PDF · ATS review and import", exact: true })
    .click();
  const input = page.getByLabel("Choose a PDF CV", { exact: true });
  await input.setInputFiles({
    name: "deniz.pdf",
    mimeType: "application/pdf",
    buffer,
  });
  await page
    .getByRole("button", { name: "Review PDF and preview import", exact: true })
    .click();
  await expect(page.locator(".pdf-import-score")).toHaveText("100/100");
  expect(
    (await (await request.get("http://127.0.0.1:8101/api/resumes")).json())
      .length,
  ).toBe(count);
  await page.getByText("Inspect extracted text", { exact: true }).click();
  await expect(page.locator(".pdf-import-text pre")).toContainText(
    "Reduced API response time",
  );
  const apply = page.getByRole("button", {
    name: "Create editable CV",
    exact: true,
  });
  await expect(apply).toBeDisabled();
  await page
    .locator(".pdf-import-report")
    .screenshot({ path: "test-results/pdf-ats-report.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await input.setInputFiles({
    name: "broken.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.locator(".pdf-import-report")).toHaveCount(0);
  await expect(apply).toHaveCount(0);
  await page
    .getByRole("button", { name: "Review PDF and preview import", exact: true })
    .click();
  await expect(
    page.locator(".pdf-import-module").getByRole("alert"),
  ).toContainText("valid PDF");
  await input.setInputFiles({
    name: "deniz.pdf",
    mimeType: "application/pdf",
    buffer,
  });
  await page
    .getByRole("button", { name: "Review PDF and preview import", exact: true })
    .click();
  await expect(page.locator(".pdf-import-score")).toHaveText("100/100");
  await page
    .getByRole("checkbox", {
      name: "I reviewed the extraction and will check the fields in the editor.",
      exact: true,
    })
    .check();
  await apply.click();
  await expect(page).toHaveURL(/\/resumes\/.+/);
  const id = page.url().split("/").pop();
  const imported = await (
    await request.get(`http://127.0.0.1:8101/api/resumes/${id}`)
  ).json();
  expect(imported.profile.email).toBe("deniz@example.com");
  expect(imported.skills[0].skills).toContain("Python");
  expect(imported.experience[0].summary).toContain("Reduced API response time");
  await request.delete(`http://127.0.0.1:8101/api/resumes/${id}`);
  await request.delete(`http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`);
});
