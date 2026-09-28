import { expect, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

// GRAPH-16: linked notes appear as a graph; clicking a node opens the note;
// a tag filter reduces the rendered set; ⇧⌘G and the local graph work.
test("opens the graph, clicks a node, and filters by tag", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+graph${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    const create = async (title: string, body = "") => {
      const response = await page.request.post("/api/notes", { data: { body, title } });
      return ((await response.json()) as { data: { id: string } }).data.id;
    };
    const hubId = await create("Hub");
    await create("Spoke One", "Links to [[Hub]]");
    await create("Spoke Two", "Also [[Hub]]");
    await create("Loner");
    await page.request.post(`/api/notes/${hubId}/tags`, { data: { name: "core" } });
    // Data was seeded through the raw API (no client cache invalidation), so
    // reload before the app reads it.
    await page.reload();
    await page.getByRole("navigation", { name: "Notes" }).waitFor();

    await page.keyboard.press("ControlOrMeta+Shift+G");
    await page.waitForURL("/graph");

    const list = page.getByRole("navigation", { name: "Notes in graph" });
    await expect(list.getByRole("button", { name: /Hub.*2 links/ })).toBeVisible();
    await expect(list).toContainText("Loner");
    await expect(page.locator(".react-flow__node")).toHaveCount(4);

    // Filter by tag: only the tagged hub remains.
    await page.getByRole("button", { name: "#core" }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await page.getByRole("button", { name: "#core" }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(4);

    // Clicking a canvas node opens that note.
    await page.locator(".react-flow__node", { hasText: "Spoke One" }).click();
    await page.waitForURL(/\/notes\//);
    await expect(page.getByLabel("Note title")).toHaveValue("Spoke One");

    // Local graph from the note: the note and its direct neighbor only.
    await page.getByRole("link", { name: "Open local graph" }).click();
    await page.waitForURL(/\/graph\?note=/);
    await expect(page.getByRole("heading", { name: "Local graph" })).toBeVisible();
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
  } finally {
    await deleteUserByEmail(email);
  }
});
