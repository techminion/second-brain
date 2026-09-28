import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

// ProseMirror syncs DOM selection changes asynchronously; wait until the
// editor's own state holds the expected selection before the next key.
async function waitForEditorSelection(page: Page, text: string): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = document.querySelector<HTMLElement & { editor?: unknown }>(".ProseMirror");
        const editor = root?.editor as
          | {
              state: {
                doc: { textBetween(from: number, to: number): string };
                selection: { from: number; to: number };
              };
            }
          | undefined;
        return editor
          ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)
          : "";
      }),
    )
    .toBe(text);
}

async function selectLastWord(page: Page, word: string): Promise<void> {
  await page.keyboard.press("End");
  await waitForEditorSelection(page, "");
  await page.keyboard.down("Shift");
  for (let step = 0; step < word.length; step += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await page.keyboard.up("Shift");
  await waitForEditorSelection(page, word);
}

// EDIT-15: the editor's menus and toolbar are fully keyboard-operable and
// the document is never a keyboard trap.
test("operates the editor toolbar and leaves the editor by keyboard alone", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+editor-keys-a11y${Date.now()}@gmail.com`;

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Correct-Horse-42-Battery");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");
    const created = await page.request.post("/api/notes", {
      data: { body: "Format this word", title: "Keyboard" },
    });
    const { data: note } = (await created.json()) as { data: { id: string } };
    await page.goto(`/notes/${note.id}`);
    const editor = page.getByRole("textbox", { name: "Note body" });
    await editor.locator("p").click();

    // Alt+F10 → toolbar; → moves between buttons; Enter applies and returns.
    await selectLastWord(page, "word");
    const toolbar = page.getByRole("toolbar", { name: "Formatting" });
    await expect(toolbar).toBeVisible();
    await page.keyboard.press("Alt+F10");
    await expect(toolbar.getByRole("button", { name: "Bold" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(toolbar.getByRole("button", { name: "Italic" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(toolbar.getByRole("button", { name: "Link" })).toBeFocused();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(editor.locator("em")).toHaveText("word");
    await expect(editor).toBeFocused();

    // Escape from the toolbar returns to the text with the selection intact.
    await waitForEditorSelection(page, "word");
    await page.keyboard.press("Alt+F10");
    await expect(toolbar.getByRole("button", { name: "Bold" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(editor).toBeFocused();
    await waitForEditorSelection(page, "word");

    // Menus pass axe while open.
    await page.keyboard.press("End");
    await waitForEditorSelection(page, "");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/");
    await expect(page.getByRole("listbox", { name: "Insert block" })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include("article")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);

    // Inside a table Tab moves between cells; Escape then Tab leaves.
    await page.keyboard.type("table");
    await page.keyboard.press("Enter");
    await expect(editor.locator("table")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(editor).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(editor).not.toBeFocused();
    await page.keyboard.press("Tab");
    await expect(editor).not.toBeFocused();
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.tagName ?? "BODY"))
      .not.toBe("BODY");
  } finally {
    await deleteUserByEmail(email);
  }
});
