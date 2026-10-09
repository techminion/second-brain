import { expect, type Page, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

// UX-07: Home shows the onboarding only for an empty graph, then a dashboard
// (today's note, quick actions, recent notes); New note works from Home, the
// ⌥⌘N / Ctrl+Alt+N shortcut and the command palette.
const newNoteShortcut = process.platform === "darwin" ? "Meta+Alt+KeyN" : "Control+Alt+KeyN";
const noteUrl = /\/notes\/[0-9a-f-]+$/;

async function countNotes(page: Page): Promise<number> {
  const response = await page.request.get("/api/notes");
  expect(response.ok()).toBeTruthy();
  const { data } = (await response.json()) as { data: { items: unknown[] } };
  return data.items.length;
}

test("Home switches from onboarding to a dashboard and creates notes", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");
  test.setTimeout(90_000);

  const email = `ameybro11+home${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    // 1. Empty graph → onboarding.
    const emptyHeading = page.getByRole("heading", { name: "Your knowledge graph is empty" });
    await expect(emptyHeading).toBeVisible();

    // 2. New note from Home's onboarding.
    await page
      .getByRole("region", { name: "Your knowledge graph is empty" })
      .getByRole("button", { name: "New note" })
      .click();
    await page.waitForURL(noteUrl);
    const firstUrl = page.url();
    await page.getByLabel("Note title").fill("Home first note");
    await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible({
      timeout: 10_000,
    });

    // 3. Back on Home → dashboard with the note in Recent notes.
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Recent notes" })).toContainText("Home first note");
    await expect(emptyHeading).toHaveCount(0);

    // 4. Shortcut creates exactly one note.
    const before = await countNotes(page);
    await page.keyboard.press(newNoteShortcut);
    await page.waitForURL((url) => noteUrl.test(url.pathname) && url.href !== firstUrl);
    await expect.poll(() => countNotes(page)).toBe(before + 1);

    // 4b. Holding the keys (one keydown, then auto-repeats) creates exactly one.
    await page.goto("/");
    await page.getByRole("heading", { level: 1, name: "Home" }).waitFor();
    const beforeHold = await countNotes(page);
    await page.evaluate((isMac) => {
      for (let i = 0; i < 5; i++) {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            altKey: true,
            bubbles: true,
            cancelable: true,
            code: "KeyN",
            ctrlKey: !isMac,
            key: isMac ? "˜" : "n",
            metaKey: isMac,
            repeat: i > 0,
          }),
        );
      }
    }, process.platform === "darwin");
    await page.waitForURL(noteUrl);
    // Give any stray duplicate create time to land before counting.
    await page.waitForLoadState("networkidle");
    await expect.poll(() => countNotes(page)).toBe(beforeHold + 1);

    // 5. Palette → New note.
    const beforePalette = await countNotes(page);
    await page.goto("/");
    await page.keyboard.press("ControlOrMeta+K");
    await page.getByRole("combobox", { name: "Search commands" }).fill("New note");
    const option = page.getByRole("option", { name: /New note/ });
    await expect(option).toHaveAttribute("aria-disabled", "false");
    await expect(option).toContainText("⌥⌘N");
    await page.keyboard.press("Enter");
    await page.waitForURL(noteUrl);
    await expect.poll(() => countNotes(page)).toBe(beforePalette + 1);

    // 6. Today card → /daily → today's note; then Home links to it.
    await page.goto("/");
    await page
      .getByRole("region", { name: "Today" })
      .getByRole("link", { name: /Open today's note/ })
      .click();
    await page.waitForURL(noteUrl);
    const dailyPath = new URL(page.url()).pathname;
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Today" }).getByRole("link")).toHaveAttribute(
      "href",
      dailyPath,
    );
  } finally {
    await deleteUserByEmail(email);
  }
});
