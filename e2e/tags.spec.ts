import { expect, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

// TAG-09: tag a note inline (creating the tag), reuse it case-insensitively on
// a second note, then browse by tag from the sidebar.
test("tags notes inline and browses by tag", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+tags${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    const ids: string[] = [];
    for (const title of ["Alpha note", "Beta note"]) {
      const created = await page.request.post("/api/notes", { data: { title } });
      ids.push(((await created.json()) as { data: { id: string } }).data.id);
    }

    await page.goto(`/notes/${ids[0]}`);
    const tagInput = page.getByRole("combobox", { name: "Add tag" });
    await tagInput.fill("Research");
    await tagInput.press("Enter");
    await expect(page.getByRole("link", { name: "#Research" }).first()).toBeVisible();

    await page.goto(`/notes/${ids[1]}`);
    await page.getByRole("combobox", { name: "Add tag" }).fill("research");
    await page.getByRole("combobox", { name: "Add tag" }).press("Enter");
    await expect(page.getByRole("list", { name: "Tags" })).toContainText("#Research");

    await page
      .getByRole("complementary", { name: "Application sidebar" })
      .getByRole("link", { name: "#Research" })
      .click();
    await page.waitForURL(/\/tags\//);
    const tagged = page.getByRole("list", { name: "Tagged items" });
    await expect(tagged).toContainText("Alpha note");
    await expect(tagged).toContainText("Beta note");
  } finally {
    await deleteUserByEmail(email);
  }
});
