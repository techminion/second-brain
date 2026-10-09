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

async function createNote(page: Page, title: string, body: string): Promise<string> {
  const response = await page.request.post("/api/notes", { data: { body, title } });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { data: { id: string } }).data.id;
}

// FTS-04/05/06/09 + FTS-07: ⇧⌘F opens search; web-search syntax works through
// the UI; snippets highlight matches; results open notes; trashed notes and
// other users' notes never appear (FR-SEARCH-1..3).
test("searches notes by content and never leaks trash or other users' notes", async ({
  browser,
  page,
}) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const stamp = Date.now();
  const owner = `ameybro11+search${stamp}@gmail.com`;
  const other = `ameybro11+search-other${stamp}@gmail.com`;
  const term = `zephyrcanal${stamp}`;
  const otherContext = await browser.newContext();

  try {
    await signUp(page, owner);
    const planId = await createNote(
      page,
      "Quarterly planning",
      `The product ${term} roadmap for Q3 covers search.`,
    );
    await createNote(page, "Grocery list", `Milk and ${term} snacks.`);
    const trashedId = await createNote(page, "Old draft", `${term} ${term} ${term}`);
    expect((await page.request.delete(`/api/notes/${trashedId}`)).ok()).toBeTruthy();

    // Another user with the same term in their own note.
    const otherPage = await otherContext.newPage();
    await signUp(otherPage, other);
    await createNote(otherPage, "Someone else's note", `Private ${term} content.`);

    // ⇧⌘F from the app opens search.
    await page.reload();
    await page.keyboard.press("ControlOrMeta+Shift+f");
    await page.waitForURL("/search");
    const field = page.getByRole("searchbox", { name: "Search notes" });
    await expect(field).toBeFocused();
    await expect(page.getByText(/exact phrase/)).toBeVisible();

    await field.fill(term);
    const results = page.getByRole("list", { name: "Search results" });
    await expect(results.getByRole("link")).toHaveCount(2);
    await expect(results).toContainText("Quarterly planning");
    await expect(results).toContainText("Grocery list");
    await expect(results).not.toContainText("Old draft");
    await expect(results).not.toContainText("Someone else's note");
    await expect(results.locator("mark").first()).toHaveText(term);
    await page.waitForURL(`/search?q=${term}`);

    // Exclusion and phrase syntax.
    await field.fill(`${term} -snacks`);
    await expect(results.getByRole("link")).toHaveCount(1);
    await expect(results).toContainText("Quarterly planning");
    await field.fill(`"product ${term} roadmap"`);
    await expect(results.getByRole("link")).toHaveCount(1);

    await field.fill("qqqnomatch");
    await expect(page.getByText(/No notes match “qqqnomatch”/)).toBeVisible();

    // Keyboard: ↓ into the results, Enter opens the note.
    await field.fill(`${term} -snacks`);
    await expect(results.getByRole("link")).toHaveCount(1);
    await field.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForURL(`/notes/${planId}`);

    // The API itself is scoped: the other user sees only their own note.
    const otherSearch = await otherPage.request.get(`/api/search?q=${term}`);
    const otherTitles = (
      (await otherSearch.json()) as { data: { items: { object: { title: string } }[] } }
    ).data.items.map((item) => item.object.title);
    expect(otherTitles).toEqual(["Someone else's note"]);

    // An empty query is a 400, not a full dump.
    expect((await page.request.get("/api/search?q=%20")).status()).toBe(400);
  } finally {
    await otherContext.close();
    await deleteUserByEmail(owner);
    await deleteUserByEmail(other);
  }
});

// UX-08: result snippets show the note's text without markdown syntax, and the
// match stays highlighted even inside a heading, bold or a wiki link.
test("search snippets strip markdown and keep highlights", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const stamp = Date.now();
  const email = `ameybro11+search-md${stamp}@gmail.com`;
  const term = `quillmark${stamp}`;

  try {
    await signUp(page, email);
    await createNote(
      page,
      "Markdown heavy",
      `## ${term} heading\n\n- **${term}** in bold and [[${term} link]] here\n\n> quoted text`,
    );

    await page.goto(`/search?q=${term}`);
    // Scoped to the results list and this note's link, so the sidebar's note
    // list or Home's recent notes can never match.
    const result = page
      .getByRole("list", { name: "Search results" })
      .getByRole("link", { name: /Markdown heavy/ });
    await expect(result).toHaveCount(1);
    await expect(result.locator("mark").first()).toHaveText(term);
    const text = (await result.textContent()) ?? "";
    expect(text).toContain(term);
    for (const syntax of ["#", "**", "[[", "]]"]) {
      expect(text).not.toContain(syntax);
    }
  } finally {
    await deleteUserByEmail(email);
  }
});
