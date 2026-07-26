import { expect, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

test("deletes a note only after confirming its name", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+delete-note${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";
  const noteTitle = "Q3 Planning";

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    const created = await page.request.post("/api/notes", {
      data: { body: "Quarterly planning notes.", title: noteTitle },
    });
    expect(created.ok()).toBeTruthy();
    const { data: note } = (await created.json()) as { data: { id: string } };

    await page.goto(`/notes/${note.id}`);
    await expect(page.getByLabel("Note title")).toHaveValue(noteTitle);

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("heading", { name: `Delete “${noteTitle}”?` })).toBeVisible();

    await page.setViewportSize({ height: 844, width: 390 });
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(`/notes/${note.id}`);

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete note" }).click();

    await page.waitForURL("/");
    await page.setViewportSize({ height: 720, width: 1280 });
    await expect(page.getByRole("navigation", { name: "Notes" })).not.toContainText(noteTitle);
  } finally {
    await deleteUserByEmail(email);
  }
});
