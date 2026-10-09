import { test, expect } from "@playwright/test";
const backend = "http://127.0.0.1:8101/api";

test("web rejects foreign hosts and origins and sends nonce CSP", async ({
  page,
  request,
}) => {
  expect(
    (
      await request.get("/api/health", {
        headers: { Host: "attacker.example" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/resumes", {
        headers: { Origin: "https://attacker.example" },
        data: { title: "Blocked" },
      })
    ).status(),
  ).toBe(403);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/settings");
  const csp = response!.headers()["content-security-policy"];
  expect(csp).toContain("script-src 'self' 'nonce-");
  expect(csp).toContain("style-src 'self'");
  expect(csp).not.toContain("unsafe-eval");
  await expect(
    page.getByRole("navigation", { name: "Settings sections" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("two tabs preserve independent drafts and resolve conflicts without losing edits", async ({
  page,
  context,
  request,
}) => {
  const original = await (
    await request.post(`${backend}/resumes`, {
      data: { title: "Draft safety QA" },
    })
  ).json();
  const id = original.metadata.id;
  await page.goto(`/resumes/${id}`);
  const second = await context.newPage();
  await second.goto(`/resumes/${id}`);
  await expect(
    second.getByRole("textbox", { name: "First Name", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "First Name", exact: true })
    .fill("First tab");
  await second
    .getByRole("textbox", { name: "First Name", exact: true })
    .fill("Second tab");
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          Object.keys(localStorage).filter((k) =>
            k.startsWith(`cv-draft-${id}-`),
          ).length,
        id,
      ),
    )
    .toBe(2);
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await (await request.get(`${backend}/resumes/${id}`)).json()).metadata
          .revision,
    )
    .toBe(2);
  await second.getByRole("button", { name: "Save Draft", exact: true }).click();
  const conflict = second.getByRole("region", {
    name: "Resolve save conflict",
  });
  await expect(conflict).toBeVisible();
  await conflict
    .getByRole("button", { name: "Keep draft copy and load server revision" })
    .click();
  await expect(conflict).toBeHidden();
  await expect(
    second.getByRole("textbox", { name: "First Name", exact: true }),
  ).toHaveValue("First tab");
  const resumes = await (await request.get(`${backend}/resumes`)).json();
  const copy = resumes.find(
    (r: { title: string }) => r.title === "Draft safety QA · Recovered draft",
  );
  expect(copy).toBeTruthy();
  expect(
    (await (await request.get(`${backend}/resumes/${copy.id}`)).json()).profile
      .firstName,
  ).toBe("Second tab");
});

test("invalid recovery cannot crash editor and leaving a dirty draft can be cancelled", async ({
  page,
  request,
}) => {
  const doc = await (
    await request.post(`${backend}/resumes`, { data: { title: "Recovery QA" } })
  ).json();
  await page.goto("/resumes");
  await page.evaluate(
    (id) =>
      localStorage.setItem(
        `cv-draft-${id}`,
        JSON.stringify({ metadata: { id, schemaVersion: 1 }, profile: [] }),
      ),
    doc.metadata.id,
  );
  await page.goto(`/resumes/${doc.metadata.id}`);
  const firstName = page.getByRole("textbox", {
    name: "First Name",
    exact: true,
  });
  await expect(firstName).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Recover draft", exact: true }),
  ).toHaveCount(0);
  await firstName.fill("Keep my draft");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "All documents", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(doc.metadata.id));
  await expect(firstName).toHaveValue("Keep my draft");
  const lastName = page.getByRole("textbox", { name: "Last Name", exact: true });
  await lastName.pressSequentially("abc");
  await lastName.press("Control+z");
  await expect(lastName).not.toHaveValue("abc");
  await expect(firstName).toHaveValue("Keep my draft");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.evaluate(() => window.history.back());
  await expect(page).toHaveURL(new RegExp(doc.metadata.id));
  await expect(firstName).toHaveValue("Keep my draft");
});
