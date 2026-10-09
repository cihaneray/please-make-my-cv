import { expect, test } from "@playwright/test";

test("anonymous preview requires explicit download and keeps the source CV unchanged", async ({ page, request }) => {
  const created = await request.post("http://127.0.0.1:8101/api/resumes", {
    data: { title: "Ada Lovelace CV" },
  });
  expect(created.ok()).toBe(true);
  const original = await created.json();
  const id = original.metadata.id as string;
  original.profile.firstName = "Ada";
  original.profile.lastName = "Lovelace";
  original.profile.email = "ada@example.com";
  original.summary = "Ada Lovelace builds reliable systems.";
  const saved = await request.put(`http://127.0.0.1:8101/api/resumes/${id}`, {
    data: { revision: original.metadata.revision, document: original },
  });
  expect(saved.ok()).toBe(true);

  let anonymousDownloads = 0;
  let exactPdfPreview: Record<string, unknown> | null = null;
  await page.route(`**/api/resumes/${id}/export/anonymous/preview`, async (route) => {
    const source = route.request().postDataJSON();
    expect(source.profile.firstName).toBe("Ada");
    expect(source.profile.email).toBe("ada@example.com");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...source,
        metadata: { ...source.metadata, title: "Candidate CV" },
        profile: { ...source.profile, firstName: "Candidate", lastName: "", email: "", photo: "" },
        summary: "[redacted] builds reliable systems.",
      }),
    });
  });
  await page.route(`**/api/resumes/${id}/export/anonymous/pdf`, async (route) => {
    anonymousDownloads += 1;
    const source = route.request().postDataJSON();
    expect(source.profile.firstName).toBe("Ada");
    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      headers: { "Content-Disposition": 'attachment; filename="candidate-cv.pdf"' },
      body: Buffer.from("%PDF-1.4\n%%EOF\n"),
    });
  });
  await page.route(`**/api/resumes/${id}/export`, async (route) => {
    exactPdfPreview = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/pdf", body: Buffer.from("%PDF-1.4\n%%EOF\n") });
  });

  await page.goto(`/resumes/${id}`);
  const firstName = page.getByRole("textbox", { name: /first name/i });
  await expect(firstName).toHaveValue("Ada");
  const downloadButton = page.getByRole("button", { name: "Download", exact: true });
  await downloadButton.focus();
  await downloadButton.click();
  await page.getByRole("menuitem", { name: /Anonymous PDF/ }).click();
  const dialog = page.getByRole("dialog", { name: "Anonymous PDF" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Download anonymous PDF" })).toBeEnabled();
  await expect(dialog.getByText("Review free text for indirect identifiers", { exact: false })).toBeVisible();
  await expect(dialog.locator("iframe").first()).toHaveAttribute("srcdoc", /Candidate/);
  expect(anonymousDownloads).toBe(0);
  await expect(firstName).toHaveValue("Ada");

  await dialog.getByRole("button", { name: "Exact PDF pages" }).click();
  await expect.poll(() => exactPdfPreview).not.toBeNull();
  expect((exactPdfPreview as unknown as { profile: { firstName: string; email: string } }).profile).toMatchObject({ firstName: "Candidate", email: "" });
  expect(anonymousDownloads).toBe(0);

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(downloadButton).toBeFocused();
  expect(anonymousDownloads).toBe(0);
  await expect(firstName).toHaveValue("Ada");
  const stored = await (await request.get(`http://127.0.0.1:8101/api/resumes/${id}`)).json();
  expect(stored.profile).toMatchObject({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" });

  await downloadButton.click();
  await page.getByRole("menuitem", { name: /Anonymous PDF/ }).click();
  await expect(dialog).toBeVisible();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download anonymous PDF" }).click();
  expect((await download).suggestedFilename()).toBe("candidate-cv.pdf");
  expect(anonymousDownloads).toBe(1);
  await expect(firstName).toHaveValue("Ada");
});
