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

// A real paste event with a real DataTransfer, dispatched at the editor.
async function paste(page: Page, data: Record<string, string>): Promise<void> {
  await page.evaluate((entries) => {
    const transfer = new DataTransfer();
    for (const [type, value] of Object.entries(entries)) {
      transfer.setData(type, value);
    }
    const target = document.querySelector(".ProseMirror");
    target?.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }),
    );
  }, data);
}

// EDIT-11: pasted markdown parses as markdown; pasted rich text converts to
// markdown on save; hostile HTML never reaches the DOM.
test("pastes markdown and rich text as structured content", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+editor-paste${Date.now()}@gmail.com`;

  try {
    await signUp(page, email);
    const created = await page.request.post("/api/notes", { data: { title: "Paste" } });
    const { data: note } = (await created.json()) as { data: { id: string } };
    await page.goto(`/notes/${note.id}`);
    const editor = page.getByRole("textbox", { name: "Note body" });
    await editor.click();

    await paste(page, { "text/plain": "## Agenda\n\n- [ ] review **draft**\n\n> note" });
    await expect(editor.locator("h2")).toHaveText("Agenda");
    await expect(page.getByRole("checkbox", { name: "Task: review draft" })).toBeVisible();
    await expect(editor.locator("blockquote")).toHaveText("note");

    await page.keyboard.press("ControlOrMeta+End");
    await paste(page, {
      "text/html":
        '<h3>From the web</h3><p>With <strong>bold</strong> and <a href="https://example.com">a link</a><img src=x onerror="alert(1)"></p><script>alert(1)</script>',
      "text/plain": "From the web With bold and a link",
    });
    await expect(editor.locator("h3")).toHaveText("From the web");
    await expect(editor.locator("img[onerror], script")).toHaveCount(0);

    await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect
      .poll(() => storedBody(page, note.id))
      .toContain("## Agenda\n\n- [ ] review **draft**");
    const saved = await storedBody(page, note.id);
    expect(saved).toContain("### From the web");
    expect(saved).toContain("With **bold** and [a link](https://example.com)");
    expect(saved).not.toMatch(/onerror|<script/);
  } finally {
    await deleteUserByEmail(email);
  }
});
