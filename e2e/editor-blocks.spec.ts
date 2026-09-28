import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

const password = "Correct-Horse-42-Battery";

async function signUp(page: Page, email: string): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("/");
}

// ProseMirror reads DOM selection changes asynchronously, so a shortcut sent
// in the same tick as Shift+Home would still see a collapsed cursor. Wait
// until the editor's own state holds the selection (Tiptap exposes the editor
// on its root element) before sending the next shortcut.
async function waitForEditorSelection(page: Page, text: string): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = document.querySelector<HTMLElement & { editor?: unknown }>(".ProseMirror");
        const editor = root?.editor as
          | {
              state: {
                doc: { textBetween(a: number, b: number): string };
                selection: { from: number; to: number };
              };
            }
          | undefined;
        if (!editor) {
          return "";
        }
        const { from, to } = editor.state.selection;
        return editor.state.doc.textBetween(from, to);
      }),
    )
    .toBe(text);
}

async function storedBody(page: Page, id: string): Promise<string> {
  const response = await page.request.get(`/api/notes/${id}`);
  return ((await response.json()) as { data: { body: string } }).data.body;
}

// EDIT-06/07: highlighted code, tables, quotes and rules render from stored
// markdown, pass axe, and survive an edit + autosave byte-for-byte.
test("renders code, tables, quotes and rules and keeps their markdown", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+editor-blocks${Date.now()}@gmail.com`;
  const body = [
    "```ts",
    "export const answer: number = 42; // the answer",
    "```",
    "",
    "| Option | Notes |",
    "| ------ | ----- |",
    "| **A**  | `x \\| y` |",
    "",
    "> Quoted",
    "",
    "---",
    "",
    "End",
  ].join("\n");

  try {
    await signUp(page, email);
    const created = await page.request.post("/api/notes", { data: { body, title: "Blocks" } });
    const { data: note } = (await created.json()) as { data: { id: string } };

    await page.goto(`/notes/${note.id}`);
    const editor = page.getByRole("textbox", { name: "Note body" });
    await expect(editor.locator("pre code .hljs-keyword").first()).toHaveText("export");
    await expect(editor.locator("pre code .hljs-comment")).toHaveText("// the answer");
    await expect(editor.locator("table th")).toHaveText(["Option", "Notes"]);
    await expect(editor.locator("table td").nth(1)).toHaveText("x | y");
    await expect(editor.locator("blockquote")).toHaveText("Quoted");
    await expect(editor.locator("hr")).toHaveCount(1);

    const results = await new AxeBuilder({ page })
      .include("article")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);

    // An unrelated edit saves the blocks back unchanged (pipes stay escaped).
    await editor.locator("p", { hasText: "End" }).click();
    await page.keyboard.press("End");
    await page.keyboard.type(".");
    await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible({
      timeout: 10_000,
    });
    const saved = await storedBody(page, note.id);
    expect(saved).toContain("```ts\nexport const answer: number = 42; // the answer\n```");
    expect(saved).toContain("| **A**  | `x \\| y` |");
    expect(saved).toContain("> Quoted\n\n---\n\nEnd.");
  } finally {
    await deleteUserByEmail(email);
  }
});

// EDIT-06/13: a ```lang fence typed live becomes a highlighted code block;
// ⌘B / ⌘I format the selection and ⌘Z / ⇧⌘Z undo and redo.
test("typing a fence and using formatting shortcuts saves as markdown", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+editor-keys${Date.now()}@gmail.com`;

  try {
    await signUp(page, email);
    const created = await page.request.post("/api/notes", { data: { title: "Keys" } });
    const { data: note } = (await created.json()) as { data: { id: string } };

    await page.goto(`/notes/${note.id}`);
    const editor = page.getByRole("textbox", { name: "Note body" });
    await editor.click();

    await page.keyboard.type("bold then italic");
    await page.keyboard.press("Shift+Home");
    await waitForEditorSelection(page, "bold then italic");
    await page.keyboard.press("ControlOrMeta+b");
    await expect(editor.locator("strong")).toHaveText("bold then italic");
    await page.keyboard.press("ControlOrMeta+i");
    await expect(editor.locator("strong em, em strong").first()).toBeVisible();
    await page.keyboard.press("ControlOrMeta+z");
    await expect(editor.locator("em")).toHaveCount(0);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect(editor.locator("em")).toHaveCount(1);

    await page.keyboard.press("End");
    await waitForEditorSelection(page, "");
    await page.keyboard.press("Enter");
    await page.keyboard.type("```python ");
    await page.keyboard.type("def f(): return None");
    await expect(editor.locator("pre code .hljs-keyword").first()).toHaveText("def");

    await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible({
      timeout: 10_000,
    });
    // StarterKit's trailing node keeps an empty paragraph after a final code
    // block (so the cursor can leave it); it serializes as trailing newlines.
    await expect
      .poll(async () => (await storedBody(page, note.id)).trimEnd())
      .toBe("***bold then italic***\n\n```python\ndef f(): return None\n```");
  } finally {
    await deleteUserByEmail(email);
  }
});
