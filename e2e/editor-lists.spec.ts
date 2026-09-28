import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

test("renders and persists bullet, ordered, and task lists", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+editor-lists${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";
  const body = [
    "## Release plan",
    "",
    "- Prepare the build",
    "- Verify the build",
    "",
    "1. Deploy preview",
    "2. Promote production",
    "",
    "- [ ] Ship list support",
    "- [x] Add round-trip tests",
    "  - [ ] Record browser evidence",
  ].join("\n");

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    const created = await page.request.post("/api/notes", {
      data: { body, title: "List support QA" },
    });
    expect(created.ok()).toBeTruthy();
    const { data: note } = (await created.json()) as { data: { id: string } };

    await page.goto(`/notes/${note.id}`);
    const editor = page.getByRole("textbox", { name: "Note body" });
    await expect(editor).toBeVisible();
    await expect(editor.locator("ul:not([data-type='taskList']) > li")).toHaveCount(2);
    await expect(editor.locator("ol > li")).toHaveCount(2);

    const pendingTask = page.getByRole("checkbox", {
      name: "Task: Ship list support",
    });
    const completedTask = page.getByRole("checkbox", {
      name: "Task: Add round-trip tests",
    });
    const nestedTask = page.getByRole("checkbox", {
      name: "Task: Record browser evidence",
    });

    await expect(pendingTask).not.toBeChecked();
    await expect(completedTask).toBeChecked();
    await expect(nestedTask).not.toBeChecked();
    await expect(pendingTask.locator("xpath=../..")).toHaveCSS("display", "flex");

    await page.setViewportSize({ height: 844, width: 390 });
    await expect(editor).toBeVisible();
    await pendingTask.click();
    await expect(pendingTask).toBeChecked();
    await expect(page.getByRole("status")).toHaveText("Saving…");
    await expect(page.getByRole("status")).toHaveText("Saved", { timeout: 10_000 });

    const response = await page.request.get(`/api/notes/${note.id}`);
    expect(response.ok()).toBeTruthy();
    const { data: savedNote } = (await response.json()) as { data: { body: string } };
    expect(savedNote.body).toContain("- [x] Ship list support");
    expect(savedNote.body).toContain("  - [ ] Record browser evidence");

    await page.reload();
    await expect(page.getByRole("checkbox", { name: "Task: Ship list support" })).toBeChecked();

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);

    await test.info().attach("mobile-task-list", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  } finally {
    await deleteUserByEmail(email);
  }
});
