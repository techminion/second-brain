import { expect, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

// NOTE-15: the full note lifecycle driven entirely through the UI —
// create (sidebar) → edit title + body (autosave) → delete (named
// confirmation) → restore from Trash → the edits survived the round trip.
test("creates, edits, deletes, and restores a note through the UI", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+note-lifecycle${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";
  const noteTitle = "Lifecycle Note";
  const notesNav = page.getByRole("navigation", { name: "Notes" });

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    // Create from the sidebar affordance; it opens the new note's page.
    await page.getByRole("button", { name: "New note" }).click();
    await page.waitForURL(/\/notes\/[0-9a-f-]+$/);
    const noteUrl = page.url();

    // Edit title and body, then wait for the autosave to settle.
    await page.getByLabel("Note title").fill(noteTitle);
    const body = page.getByRole("textbox", { name: "Note body" });
    await body.click();
    await page.keyboard.type("Remember the milk");
    await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect(notesNav).toContainText(noteTitle);

    // Delete through the named confirmation.
    await page.getByRole("button", { name: "Note actions" }).click();
    await page.getByRole("menuitem", { name: "Delete…" }).click();
    await expect(page.getByRole("heading", { name: `Delete “${noteTitle}”?` })).toBeVisible();
    await page.getByRole("button", { name: "Delete note" }).click();
    await page.waitForURL("/");
    await expect(notesNav).not.toContainText(noteTitle);

    // Restore from Trash.
    await page.getByRole("link", { name: "Trash" }).click();
    await page.waitForURL("/trash");
    const deleted = page.getByRole("list", { name: "Deleted notes" });
    await expect(deleted).toContainText(noteTitle);
    await expect(deleted).toContainText("Deletes in 30 days");
    await page.getByRole("button", { name: `Restore ${noteTitle}` }).click();
    await expect(page.getByText("Trash is empty.")).toBeVisible();
    await expect(notesNav).toContainText(noteTitle);

    // The restored note kept its edits.
    await notesNav.getByRole("link", { name: new RegExp(noteTitle) }).click();
    await page.waitForURL(noteUrl);
    await expect(page.getByLabel("Note title")).toHaveValue(noteTitle);
    await expect(page.getByRole("textbox", { name: "Note body" })).toContainText(
      "Remember the milk",
    );
  } finally {
    await deleteUserByEmail(email);
  }
});
