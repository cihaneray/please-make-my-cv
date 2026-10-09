import { test, expect } from "@playwright/test";

test("email drafts require a request, remain editable and survive reload", async ({
  page,
  request,
}) => {
  const job = await (
    await request.post("http://127.0.0.1:8101/api/jobs", {
      data: {
        company: "Email test company",
        position: "Email test role",
        description: "Build services",
      },
    })
  ).json();
  await page.addInitScript(() =>
    localStorage.setItem("cv_workspace_language", "en"),
  );
  let generated = 0;
  await page.route(`**/api/jobs/${job.id}/email-draft`, (route) => {
    generated++;
    return route.fulfill({
      json: {
        subject: "Application follow-up",
        body: "Dear [recipient],\nPlease share an update.",
        notice: "No email sent.",
      },
    });
  });
  await page.goto("/jobs");
  await page.getByText("Email test company", { exact: true }).first().click();
  const panel = page.getByRole("region", { name: "Application email drafts" });
  await expect(panel).toBeVisible();
  expect(generated).toBe(0);
  await panel
    .getByRole("button", { name: "Prepare email draft", exact: true })
    .click();
  await expect(panel.getByLabel("Email text", { exact: true })).toContainText(
    "Dear [recipient]",
  );
  await panel
    .getByLabel("Email subject", { exact: true })
    .fill("My edited follow-up");
  await expect
    .poll(async () =>
      page.evaluate(
        (id) =>
          JSON.parse(localStorage.getItem(`job-email-${id}`) || "null")
            ?.subject,
        job.id,
      ),
    )
    .toBe("My edited follow-up");
  await page.reload();
  await page.getByText("Email test company", { exact: true }).first().click();
  await expect(panel.getByLabel("Email subject", { exact: true })).toHaveValue(
    "My edited follow-up",
  );
  expect(generated).toBe(1);
  expect(
    (
      await (
        await request.get(`http://127.0.0.1:8101/api/jobs/${job.id}`)
      ).json()
    ).notes,
  ).toBe("");
});
