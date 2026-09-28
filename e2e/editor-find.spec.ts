import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

// EDIT-18: ⌘F opens find-in-note from anywhere on the note page, counts and
// highlights matches, steps with Enter / ⇧Enter, and Escape returns to the
// editor with the current match selected.
test("finds text within the current note", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+editor-find${Date.now()}@gmail.com`;

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Correct-Horse-42-Battery");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    const created = await page.request.post("/api/notes", {
      data: { body: "Alpha first.\n\n- then **alp**ha\n\nFinally alpha.", title: "Find" },
    });
    const { data: note } = (await created.json()) as { data: { id: string } };
    await page.goto(`/notes/${note.id}`);
    const editor = page.getByRole("textbox", { name: "Note body" });
    await expect(editor).toContainText("Finally alpha.");

    // From the title field, not the editor: ⌘F still targets the note.
    await page.getByLabel("Note title").click();
    await page.keyboard.press("ControlOrMeta+f");
    const findBar = page.getByRole("search", { name: "Find in note" });
    const input = findBar.getByRole("searchbox", { name: "Find in note" });
    await expect(input).toBeFocused();

    await input.fill("alpha");
    const status = findBar.getByRole("status");
    await expect(status).toHaveText("1 of 3");
    await expect(editor.locator("[data-find-match]")).not.toHaveCount(0);
    await expect(editor.locator('[data-find-match="current"]')).toHaveCount(1);

    await input.press("Enter");
    await expect(status).toHaveText("2 of 3");
    await input.press("Shift+Enter");
    await expect(status).toHaveText("1 of 3");
    await findBar.getByRole("button", { name: "Previous match" }).click();
    await expect(status).toHaveText("3 of 3");

    await input.fill("zeta");
    await expect(status).toHaveText("No matches");
    await expect(findBar.getByRole("button", { name: "Next match" })).toBeDisabled();

    const results = await new AxeBuilder({ page })
      .include("article")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);

    await input.fill("first");
    await expect(status).toHaveText("1 of 1");
    await input.press("Escape");
    await expect(findBar).toBeHidden();
    await expect(editor).toBeFocused();
    await expect(editor.locator("[data-find-match]")).toHaveCount(0);
    await page.keyboard.type("1st");
    await expect(editor).toContainText("Alpha 1st.");
  } finally {
    await deleteUserByEmail(email);
  }
});
