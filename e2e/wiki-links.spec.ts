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

async function createNote(page: Page, title: string, body = ""): Promise<string> {
  const response = await page.request.post("/api/notes", { data: { body, title } });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { data: { id: string } }).data.id;
}

async function waitForSaved(page: Page): Promise<void> {
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible({
    timeout: 10_000,
  });
}

// LINK-11 (02_PRD §5 "Create a note and link it") + BACK-06: given note A,
// creating note B with `[[A]]` in its body makes A's backlinks panel list B —
// with no page reload anywhere after A's (empty) backlinks were first shown.
test("links a new note to an existing one and the backlink appears live", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+link-create${Date.now()}@gmail.com`;
  const backlinks = page.getByRole("complementary", { name: "Context panel" });
  const notesNav = page.getByRole("navigation", { name: "Notes" });

  try {
    await signUp(page, email);
    await createNote(page, "Project Atlas", "The mapping project.");
    // Seeded through the raw API (no client cache invalidation): reload once,
    // before the flow starts; everything after this is client-side.
    await page.reload();

    // Open A: its backlinks panel is empty (and now cached as empty).
    await notesNav.getByRole("link", { name: /Project Atlas/ }).click();
    await page.waitForURL(/\/notes\//);
    const noteAUrl = page.url();
    await expect(backlinks).toContainText("No notes link here yet.");

    // Create B and link it to A through the `[[` autocomplete.
    await page.getByRole("button", { name: "New note" }).click();
    await page.waitForURL((url) => url.href !== noteAUrl && /\/notes\//.test(url.pathname));
    await page.getByLabel("Note title").fill("Weekly review");
    const body = page.getByRole("textbox", { name: "Note body" });
    await body.click();
    await page.keyboard.type("Progress on [[Proj");
    const suggestions = page.getByRole("listbox", { name: "Link suggestions" });
    await expect(suggestions.getByRole("option", { name: "Project Atlas" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(body).toContainText("Progress on [[Project Atlas]]");
    await waitForSaved(page);

    // The saved link resolves to A; following it is a client-side navigation.
    const link = body.locator('[data-wiki-link="resolved"]', { hasText: "Project Atlas" });
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL(noteAUrl);
    await expect(page.getByLabel("Note title")).toHaveValue("Project Atlas");

    // A's backlinks list B without a manual refresh (FR-LINK-6).
    const entry = backlinks.getByRole("link", { name: /Weekly review/ });
    await expect(entry).toBeVisible();
    await expect(entry).toContainText("Progress on [[Project Atlas]]");
    await entry.click();
    await expect(page.getByLabel("Note title")).toHaveValue("Weekly review");
  } finally {
    await deleteUserByEmail(email);
  }
});

// LINK-12 (02_PRD §5 "Rename a linked note"): renaming A to "A2" rewrites
// `[[A]]` in B, B's link still resolves to A, and B's markdown is otherwise
// untouched.
test("renaming a linked note keeps the link resolved in the linking note", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+link-rename${Date.now()}@gmail.com`;
  const notesNav = page.getByRole("navigation", { name: "Notes" });

  try {
    await signUp(page, email);
    const noteAId = await createNote(page, "Draft plan", "Plan details.");
    const noteBId = await createNote(page, "Standup", "Follow **the** [[Draft plan]] today.");

    await page.goto(`/notes/${noteAId}`);
    await expect(page.getByLabel("Note title")).toHaveValue("Draft plan");
    await page.getByLabel("Note title").fill("Final plan");
    await waitForSaved(page);
    await expect(notesNav).toContainText("Final plan");

    // B shows the new title, still as a resolved link that opens A.
    await notesNav.getByRole("link", { name: /Standup/ }).click();
    await page.waitForURL(`/notes/${noteBId}`);
    const body = page.getByRole("textbox", { name: "Note body" });
    await expect(body).toContainText("[[Final plan]]");
    await expect(body).not.toContainText("Draft plan");
    const link = body.locator('[data-wiki-link="resolved"]', { hasText: "Final plan" });
    await expect(link).toBeVisible();

    // The stored markdown changed only through the rename.
    const stored = await page.request.get(`/api/notes/${noteBId}`);
    expect(((await stored.json()) as { data: { body: string } }).data.body).toBe(
      "Follow **the** [[Final plan]] today.",
    );

    await link.click();
    await page.waitForURL(`/notes/${noteAId}`);
    await expect(page.getByLabel("Note title")).toHaveValue("Final plan");
    await expect(page.getByRole("complementary", { name: "Context panel" })).toContainText(
      "Standup",
    );
  } finally {
    await deleteUserByEmail(email);
  }
});
