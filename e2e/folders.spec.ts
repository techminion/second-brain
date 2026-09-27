import { expect, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

// FOLD-12: create nested folders, move a note into one, then delete the parent
// keeping its contents — the note and subfolder relocate, nothing is trashed.
test("creates nested folders, moves a note, and deletes with relocation", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+folders${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";
  const folders = page.getByRole("tree", { name: "Folders" });

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    await page.getByRole("button", { name: "New folder" }).click();
    await page.getByRole("textbox", { name: "New folder name" }).fill("Work");
    await page.keyboard.press("Enter");
    await expect(folders.getByRole("treeitem", { name: "Work" })).toBeVisible();

    await page.getByRole("button", { name: "Actions for folder Work" }).click();
    await page.getByRole("menuitem", { name: "New subfolder" }).click();
    await page.getByRole("textbox", { name: "New folder name" }).fill("Q3");
    await page.keyboard.press("Enter");
    await expect(folders.getByRole("treeitem", { name: "Q3" })).toBeVisible();

    // Move a note into Q3 through the note page's folder picker.
    const created = await page.request.post("/api/notes", { data: { title: "Roadmap" } });
    const { data: note } = (await created.json()) as { data: { id: string } };
    await page.goto(`/notes/${note.id}`);
    await page.getByLabel("Folder").selectOption({ label: "Work / Q3" });
    await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();

    await folders.getByRole("treeitem", { name: "Q3" }).getByText("Q3").click();
    await page.waitForURL(/\/folders\//);
    await expect(page.getByRole("link", { name: /Roadmap/ })).toBeVisible();

    // Delete Q3, keeping its contents: the note relocates to Work.
    await page.getByRole("button", { name: "Actions for folder Q3" }).click();
    await page.getByRole("menuitem", { name: "Delete…" }).click();
    await page.getByRole("radio", { name: /Keep contents/ }).check();
    await page.getByRole("button", { name: "Delete folder" }).click();
    await page.waitForURL("/");
    await expect(folders.getByRole("treeitem", { name: "Q3" })).toHaveCount(0);

    await folders.getByRole("treeitem", { name: "Work" }).getByText("Work").click();
    await expect(page.getByRole("link", { name: /Roadmap/ })).toBeVisible();
  } finally {
    await deleteUserByEmail(email);
  }
});
