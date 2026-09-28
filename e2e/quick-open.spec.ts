import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

// SRCH-07: ⌘P opens quick-open from anywhere (the editor included); an empty
// query lists recent notes, typing ranks titles, Enter opens the note; the
// palette's "Quick-open note" command opens the same dialog.
test("quick-opens notes by title", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+quick-open${Date.now()}@gmail.com`;

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Correct-Horse-42-Battery");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    const ids: Record<string, string> = {};
    for (const title of ["Quarterly planning", "Reading list", "Recipe ideas"]) {
      const created = await page.request.post("/api/notes", { data: { title } });
      ids[title] = ((await created.json()) as { data: { id: string } }).data.id;
    }

    // From inside the editor.
    await page.goto(`/notes/${ids["Reading list"]}`);
    await page.getByRole("textbox", { name: "Note body" }).click();
    await page.keyboard.press("ControlOrMeta+p");
    const dialog = page.getByRole("dialog", { name: "Open a note" });
    await expect(dialog).toBeVisible();
    const recent = dialog.getByRole("listbox", { name: "Recent notes" });
    await expect(recent.getByRole("option")).toHaveCount(3);
    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);

    const input = dialog.getByRole("combobox", { name: "Find a note by title" });
    await input.fill("quartely plan");
    const matches = dialog.getByRole("listbox", { name: "Matching notes" });
    await expect(matches.getByRole("option").first()).toHaveText("Quarterly planning");
    await input.press("Enter");
    await page.waitForURL(`/notes/${ids["Quarterly planning"]}`);
    await expect(dialog).toBeHidden();
    await expect(page.getByLabel("Note title")).toHaveValue("Quarterly planning");

    // Through the command palette.
    await page.getByLabel("Note title").click();
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByRole("combobox", { name: "Search commands" }).fill("quick");
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await input.fill("zzz no such note");
    await expect(dialog.getByRole("status")).toHaveText("No notes match that title.");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  } finally {
    await deleteUserByEmail(email);
  }
});
