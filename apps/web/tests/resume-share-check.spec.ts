import { test, expect } from "@playwright/test";
import { checkResumeSharing } from "../src/lib/resume-share-check";
import type { ResumeDocument } from "../src/lib/types";

function fixture(): ResumeDocument {
  return {
    metadata: {
      id: "share-fixture",
      schemaVersion: 1,
      title: "Fixture",
      targetRole: "",
      templateId: "classic",
      language: "en",
      targetMarket: "GLOBAL",
      tags: [],
      revision: 1,
      createdAt: "",
      updatedAt: "",
      parentResumeId: null,
      targetJob: null,
      isArchived: false,
    },
    profile: {
      firstName: "Cihan",
      lastName: "Bozkurt",
      headline: "Engineer",
      photo: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      github: "",
      linkedin: "",
      links: [],
    },
    summary: "Engineer building reliable applications.",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    languages: [],
    customSections: [],
    design: {
      sectionOrder: [],
      template: "classic",
      fontFamily: "",
      fontSize: "",
      spacing: "",
      margins: "",
      accentColor: "",
    },
    visibility: {
      showPhoto: false,
      showSummary: true,
      showExperience: true,
      showEducation: true,
      showProjects: true,
      showSkills: true,
      showCertifications: true,
      showLanguages: true,
    },
  };
}

test("sharing links distinguish accepted bare domains from unsafe, malformed, credentialed and private addresses", () => {
  for (const url of [
    "https://example.org/profile",
    "example.org/path",
    "https://github.com/cihan",
    "https://[2606:4700:4700::1111]/",
  ]) {
    const doc = fixture();
    doc.profile.website = url;
    expect(
      checkResumeSharing(doc).filter((item) => item.kind === "link"),
      url,
    ).toEqual([]);
  }
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,secret",
    "ftp://example.org",
    "https://user:password@example.org",
    "https://bad host/path",
    "https://",
    "http://example.org",
    "http://localhost:3000",
    "https://10.2.3.4",
    "https://169.254.169.254",
    "https://[::1]",
    "https://[fd00::1]",
    "example.local",
  ]) {
    const doc = fixture();
    doc.profile.website = url;
    const result = checkResumeSharing(doc);
    expect(
      result.filter((item) => item.kind === "link"),
      url,
    ).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("password@example.org");
  }
});

test("checks current visible export content without mutating the draft or inspecting hidden sections", () => {
  const doc = fixture();
  doc.summary = "TODO: replace this summary";
  doc.projects = [
    {
      id: "project",
      name: "TBD",
      role: "",
      url: "javascript:alert(1)",
      startDate: "",
      endDate: "",
      bullets: ["Lorem ipsum"],
      technologies: [],
    },
  ];
  doc.profile.email = "person@example.org";
  doc.profile.phone = "+90 555 000 00 00";
  doc.profile.photo = "data:image/png;base64,secret";
  const before = JSON.stringify(doc);
  expect(
    checkResumeSharing(doc).filter((item) => item.kind === "placeholder"),
  ).toHaveLength(3);
  expect(
    checkResumeSharing(doc).filter((item) => item.kind === "privacy"),
  ).toHaveLength(1);
  expect(JSON.stringify(doc)).toBe(before);
  doc.visibility.showSummary = false;
  doc.visibility.showProjects = false;
  doc.visibility.showPhoto = true;
  const result = checkResumeSharing(doc, "tr");
  expect(
    result.filter(
      (item) => item.kind === "placeholder" || item.kind === "link",
    ),
  ).toEqual([]);
  expect(result.filter((item) => item.kind === "privacy")).toHaveLength(2);
  expect(JSON.stringify(result)).not.toContain("base64");
  expect(result[0].detail).toContain("e-posta");
});

test("placeholder heuristics avoid ordinary words and bound excerpts", () => {
  const doc = fixture();
  doc.summary =
    "Built a Todoist integration for a company named Example Technologies. Supports task queues.";
  expect(checkResumeSharing(doc)).toEqual([]);
  doc.summary = "TODO: " + "x".repeat(1000);
  expect(checkResumeSharing(doc)[0].detail).toHaveLength(200);
});

test("share check is advisory, uses current unsaved draft, traps focus and restores it after closing", async ({
  page,
  request,
}) => {
  const created = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "Share check fixture" },
  });
  expect(created.ok()).toBeTruthy();
  const doc = await created.json();
  try {
    await page.goto(`/resumes/${doc.metadata.id}`);
    const trigger = page.getByTestId("resume-share-check-trigger");
    await expect(trigger).toBeEnabled();
    await trigger.click();
    const dialog = page.getByTestId("resume-share-check-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("not a safety certificate or ATS score");
    for (const theme of ["light", "dark"] as const) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
        document.documentElement.classList.toggle("dark", value === "dark");
      }, theme);
      await page.screenshot({
        path: `test-results/share-check-${theme}.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/share-check-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(
      dialog.getByRole("button", { name: "Close sharing check" }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog.getByRole("button", { name: "Back to editor" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await page
      .getByRole("button", { name: "Professional Summary", exact: true })
      .click();
    const summary = page.getByRole("textbox", {
      name: "Professional Summary",
      exact: true,
    });
    await summary.fill("TODO: unsaved sharing check content");
    await trigger.click();
    await expect(dialog.getByTestId("resume-share-warning")).toContainText(
      "TODO: unsaved sharing check content",
    );
    await dialog.getByRole("button", { name: "Back to editor" }).click();
    await expect(summary).toHaveValue("TODO: unsaved sharing check content");
    const persisted = await request.get(
      `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
    );
    expect((await persisted.json()).summary).not.toBe(
      "TODO: unsaved sharing check content",
    );
    await expect(page.getByRole("button", { name: /^Download/ })).toBeEnabled();
  } finally {
    await request.delete(
      `http://127.0.0.1:8101/api/resumes/${doc.metadata.id}`,
    );
  }
});
