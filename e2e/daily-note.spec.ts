import { expect, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// DAILY-07: ⌘D opens today's note (created from the template on first open,
// the same note on the second), and the sidebar date field opens a past date.
test("opens today's daily note by shortcut and navigates to a past date", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+daily${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";
  const today = isoDate(new Date());

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    await page.keyboard.press("ControlOrMeta+d");
    await page.waitForURL(/\/notes\/[0-9a-f-]+$/);
    const todayUrl = page.url();
    await expect(page.getByLabel("Note title")).toHaveValue(today);
    await expect(page.getByRole("textbox", { name: "Note body" })).toContainText("Tasks");

    // Idempotent: opening today again lands on the same note. Navigate to
    // /daily directly (the sidebar "Today" link's target) so the wait covers
    // the whole /daily → /daily/<today> → /notes/<id> redirect chain; clicking
    // the link and waiting for todayUrl returned before the chain finished,
    // letting its last redirect overtake the date-field navigation below.
    await expect(page.getByRole("link", { name: /Today/ })).toHaveAttribute("href", "/daily");
    await page.goto("/daily");
    await page.waitForURL(todayUrl);
    await expect(page.getByLabel("Note title")).toHaveValue(today);

    // The calendar pop-up (UX-04): page back to January 2026 and pick the 15th.
    await page.getByRole("button", { name: "Open daily note for date" }).click();
    const target = page.locator('[data-date="2026-01-15"]');
    for (let step = 0; step < 36 && (await target.count()) === 0; step += 1) {
      await page.getByRole("button", { name: "Previous month" }).click();
    }
    await target.click();
    await expect(page.getByLabel("Note title")).toHaveValue("2026-01-15");

    await page.getByRole("link", { name: "Next day, 2026-01-16" }).click();
    await expect(page.getByLabel("Note title")).toHaveValue("2026-01-16");
  } finally {
    await deleteUserByEmail(email);
  }
});
