import { expect, type Page, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

async function signUp(page: Page, email: string): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Correct-Horse-42-Battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("/");
}

async function storedBody(page: Page, id: string): Promise<string> {
  const response = await page.request.get(`/api/notes/${id}`);
  return ((await response.json()) as { data: { body: string } }).data.body;
}

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

// EDIT-08: `/` at line start opens the block menu; picking inserts the block.
// EDIT-09: selecting text shows the formatting toolbar; bold and link apply
// and save as markdown, and a javascript: link is refused.
test("inserts blocks from the slash menu and formats from the toolbar", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+editor-menus${Date.now()}@gmail.com`;

  try {
    await signUp(page, email);
    const created = await page.request.post("/api/notes", { data: { title: "Menus" } });
    const { data: note } = (await created.json()) as { data: { id: string } };
    await page.goto(`/notes/${note.id}`);
    const editor = page.getByRole("textbox", { name: "Note body" });
    await editor.click();

    // Slash menu → Quote.
    await page.keyboard.type("/");
    const menu = page.getByRole("listbox", { name: "Insert block" });
    await expect(menu).toBeVisible();
    await page.keyboard.type("quo");
    await expect(menu.getByRole("option")).toHaveCount(1);
    await page.keyboard.press("Enter");
    await expect(menu).toBeHidden();
    await page.keyboard.type("Read the docs");
    await expect(editor.locator("blockquote")).toHaveText("Read the docs");

    // Toolbar: select "docs", bold it, then link it.
    await page.keyboard.down("Shift");
    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press("ArrowLeft");
    }
    await page.keyboard.up("Shift");
    await waitForEditorSelection(page, "docs");
    const toolbar = page.getByRole("toolbar", { name: "Formatting" });
    await expect(toolbar).toBeVisible();
    await toolbar.getByRole("button", { name: "Bold" }).click();
    await expect(editor.locator("strong")).toHaveText("docs");
    await expect(toolbar.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await toolbar.getByRole("button", { name: "Link" }).click();
    const address = page.getByRole("textbox", { name: "Link address" });
    await address.fill("javascript:alert(1)");
    await address.press("Enter");
    await expect(page.getByRole("alert").filter({ hasText: "https://" })).toBeVisible();
    await address.fill("example.com/docs");
    await address.press("Enter");
    await expect(editor.locator('a[href="https://example.com/docs"]')).toHaveText("docs");

    // Slash menu → Table, on a new line after the quote.
    await editor.locator("blockquote").click();
    await page.keyboard.press("End");
    await waitForEditorSelection(page, "");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/table");
    await page.keyboard.press("Enter");
    await expect(editor.locator("table th")).toHaveCount(3);
    await page.keyboard.type("Owner");

    await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect
      .poll(() => storedBody(page, note.id))
      .toMatch(/^> Read the \[\*\*docs\*\*\]\(https:\/\/example\.com\/docs\)\n\n\| Owner +\|/);
  } finally {
    await deleteUserByEmail(email);
  }
});
