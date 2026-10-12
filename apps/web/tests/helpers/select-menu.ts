import { expect, type Locator } from "@playwright/test";

export async function selectMenu(trigger: Locator, value: string) {
  if ((await trigger.getAttribute("aria-expanded")) !== "true")
    await trigger.click();
  const popup = trigger.page().locator('[role="listbox"]:popover-open');
  await popup
    .locator(`[role="option"][data-value=${JSON.stringify(value)}]`)
    .click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
}
