import { expect, Page, test } from "@playwright/test";
import { JobApplication, JobStatus } from "../src/lib/types";

const jobs: JobApplication[] = ["alpha", "beta"].map((id) => ({
  id,
  company: id.toUpperCase(),
  position: `${id} Engineer`,
  location: "Remote",
  url: "",
  description: "Build APIs",
  notes: "",
  status: "saved" as JobStatus,
  linkedResumeId: null,
  interviewAt: "",
  followUpDate: "",
  coverLetter: "",
  requirements: [],
  timeline: [],
  createdAt: "2026-10-09T10:00:00Z",
  updatedAt: "2026-10-09T10:00:00Z",
}));

async function setup(page: Page, language: "en" | "tr") {
  await page.addInitScript((value) => {
    localStorage.setItem("cv_workspace_language", value);
  }, language);
  await page.route(/\/api\/resumes(?:\?.*)?$/, (route) =>
    route.fulfill({ json: [] }),
  );
}

for (const language of ["en", "tr"] as const) {
  test(`${language}: job deep link selects the requested record and invalid IDs have an explicit fallback`, async ({
    page,
  }) => {
    await setup(page, language);
    await page.route(/\/api\/jobs(?:\?.*)?$/, (route) =>
      route.fulfill({ json: jobs }),
    );
    await page.goto("/jobs?selected=beta");
    await expect(
      page.locator(".application-index-row.is-selected"),
    ).toContainText("BETA");
    await expect(
      page.locator(".application-index-row").filter({ hasText: "ALPHA" }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.goto("/jobs?selected=unknown");
    await expect(
      page.locator(".application-index-row.is-selected"),
    ).toContainText("ALPHA");
    await expect(
      page.locator(".application-stage > [role=status]"),
    ).toContainText(
      language === "tr"
        ? "Bağlantıdaki ilan bulunamadı"
        : "The linked job was not found",
    );
  });

  test(`${language}: job dialog names fields, keeps keyboard focus inside and restores it on Escape`, async ({
    page,
  }) => {
    await setup(page, language);
    await page.route(/\/api\/jobs(?:\?.*)?$/, (route) =>
      route.fulfill({ json: jobs }),
    );
    await page.goto("/jobs");
    const opener = page.getByRole("button", {
      name: language === "tr" ? "Hedef İlan Ekle" : "Add Target Job",
      exact: true,
    });
    await opener.click();
    const dialog = page.getByRole("dialog", {
      name: language === "tr" ? "Yeni Hedef İlan Ekle" : "Add New Target Job",
    });
    await expect(dialog).toBeVisible();
    const company = dialog.getByLabel(
      language === "tr" ? "Şirket Adı" : "Company Name",
      { exact: true },
    );
    await expect(company).toBeFocused();
    for (const name of language === "tr"
      ? ["Pozisyon Ünvanı", "Konum", "İş Tanımı / Gereksinimler"]
      : ["Position Title", "Location", "Job Description / Requirements"]) {
      await expect(dialog.getByLabel(name, { exact: true })).toBeVisible();
    }
    for (const key of ["Tab", "Shift+Tab"]) {
      for (let index = 0; index < 15; index++) {
        await page.keyboard.press(key);
        expect(
          await dialog.evaluate((element) =>
            element.contains(document.activeElement),
          ),
        ).toBe(true);
      }
    }
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    await opener.click();
    await expect(company).toBeFocused();
    await dialog
      .getByRole("button", {
        name: language === "tr" ? "İptal" : "Cancel",
        exact: true,
      })
      .click();
    await expect(opener).toBeFocused();
  });

  test(`${language}: a dismissed load notice leaves a persistent error and retry recovers without reload`, async ({
    page,
  }) => {
    await setup(page, language);
    let attempts = 0;
    await page.route(/\/api\/jobs(?:\?.*)?$/, (route) => {
      attempts += 1;
      return attempts === 1
        ? route.fulfill({ status: 503, json: { detail: "unavailable" } })
        : route.fulfill({ json: jobs });
    });
    await page.goto("/jobs?selected=beta");
    const error = page.locator(".applications-index").getByRole("alert");
    await expect(error).toContainText(
      language === "tr" ? "İlanlar yüklenemedi" : "Could not load jobs",
    );
    await page
      .getByRole("button", {
        name: language === "tr" ? "Kapat" : "Dismiss",
        exact: true,
      })
      .click();
    await expect(error).toBeVisible();
    await expect(
      page.getByText(
        language === "tr" ? "Henüz eklenen ilan yok." : "No jobs added yet.",
        { exact: true },
      ),
    ).not.toBeVisible();
    await expect(page.locator(".applications-index-heading > span")).toHaveText(
      "—",
    );
    await error
      .getByRole("button", {
        name: language === "tr" ? "Tekrar dene" : "Try again",
        exact: true,
      })
      .click();
    await expect(error).not.toBeVisible();
    await expect(
      page.locator(".application-index-row.is-selected"),
    ).toContainText("BETA");
    expect(attempts).toBe(2);
  });
}

test("successful empty jobs response shows the empty state without an error", async ({
  page,
}) => {
  await setup(page, "en");
  await page.route(/\/api\/jobs(?:\?.*)?$/, (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/jobs");
  await expect(
    page.getByText("No jobs added yet.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".applications-index").getByRole("alert"),
  ).not.toBeVisible();
  await expect(page.locator(".applications-index-heading > span")).toHaveText(
    "0",
  );
});

test("job selection follows same-page client navigation and browser back/forward", async ({
  page,
}) => {
  await setup(page, "en");
  let requests = 0;
  await page.route(/\/api\/jobs(?:\?.*)?$/, (route) => {
    requests++;
    return route.fulfill({ json: jobs });
  });
  await page.goto("/jobs?selected=beta");
  const selected = page.locator(".application-index-row.is-selected");
  await expect(selected).toContainText("BETA");
  // Next.js integrates native history calls with its search-parameter hook.
  await page.evaluate(() =>
    window.history.pushState(null, "", "/jobs?selected=alpha"),
  );
  await expect(selected).toContainText("ALPHA");
  await page.evaluate(() =>
    window.history.pushState(null, "", "/jobs?selected=beta"),
  );
  await expect(selected).toContainText("BETA");
  await page.goBack();
  await expect(selected).toContainText("ALPHA");
  await page.goForward();
  await expect(selected).toContainText("BETA");
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("link", { name: "Target Jobs", exact: true })
    .click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(selected).toContainText("ALPHA");
  await page.goBack();
  await expect(selected).toContainText("BETA");
  expect(requests).toBe(1);
});
