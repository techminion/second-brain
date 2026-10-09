import { expect, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

// UX-09: Settings → Appearance switches the theme live, persists it in the
// ADR-9 cookie across reloads (no flash: the SSR script reads the cookie), and
// System follows the OS preference.
test("Appearance switches and persists the theme", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+appearance${Date.now()}@gmail.com`;
  const html = page.locator("html");

  try {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Correct-Horse-42-Battery");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    await page.goto("/settings");
    const main = page.getByRole("main");
    await main.getByRole("heading", { level: 1, name: "Settings" }).waitFor();
    // Scoped to the Appearance section's radio group: no other control on the
    // page (or in the sidebar) can match these names.
    const theme = main
      .getByRole("region", { name: "Appearance" })
      .getByRole("radiogroup", { name: "Theme" });
    await expect(theme.getByRole("radio", { name: "System" })).toBeChecked();
    await expect(html).not.toHaveClass(/\bdark\b/);

    // Dark applies immediately, without a reload.
    const saved = page.waitForResponse(
      (response) => response.url().endsWith("/api/theme") && response.status() === 204,
    );
    await theme.getByText("Dark", { exact: true }).click();
    await expect(html).toHaveClass(/\bdark\b/);
    await saved;

    // Persists across a reload, dark from the first paint.
    await page.reload();
    await expect(html).toHaveClass(/\bdark\b/);
    await expect(theme.getByRole("radio", { name: "Dark" })).toBeChecked();

    // Keyboard: arrows move within the group (Dark → System).
    await theme.getByRole("radio", { name: "Dark" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(theme.getByRole("radio", { name: "System" })).toBeChecked();

    // System follows the OS, live.
    await expect(html).not.toHaveClass(/\bdark\b/);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html).toHaveClass(/\bdark\b/);
    await page.emulateMedia({ colorScheme: "light" });
    await expect(html).not.toHaveClass(/\bdark\b/);
  } finally {
    await deleteUserByEmail(email);
  }
});
