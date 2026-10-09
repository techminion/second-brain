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
    await page.getByRole("button", { name: "Note actions" }).click();
    await page.getByRole("menuitem", { name: "Open in graph" }).click();
    await page.waitForURL(/\/graph\?note=/);
    await expect(page.getByRole("heading", { name: "Local graph" })).toBeVisible();
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
  } finally {
    await deleteUserByEmail(email);
  }
});

// UX-11: colour by folder, with a legend that survives a reload and applies
// the folder filter. Lookups are scoped to the radiogroup, the legend and the
// filter chip group, so the sidebar folder tree can never match.
test("colours the graph by folder with a legend", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+graphcolour${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    const folder = async (name: string) => {
      const response = await page.request.post("/api/folders", { data: { name } });
      return ((await response.json()) as { data: { id: string } }).data.id;
    };
    const create = async (title: string, folderId: string, tag: string) => {
      const response = await page.request.post("/api/notes", { data: { folderId, title } });
      const id = ((await response.json()) as { data: { id: string } }).data.id;
      await page.request.post(`/api/notes/${id}/tags`, { data: { name: tag } });
    };
    const work = await folder("Work");
    const home = await folder("Home");
    await create("Plan", work, "alpha");
    await create("Spec", work, "beta");
    await create("Garden", home, "alpha");

    await page.goto("/graph");
    const colourBy = page.getByRole("main").getByRole("radiogroup", { name: "Colour by" });
    await colourBy.getByText("Folder").click();

    const legend = page.getByRole("main").getByRole("region", { name: "Graph legend" });
    await expect(legend.getByRole("button", { name: /^Work, 2 notes/ })).toBeVisible();
    await expect(legend.getByRole("button", { name: /^Home, 1 note/ })).toBeVisible();

    await page.reload();
    await expect(colourBy.getByRole("radio", { name: "Folder" })).toBeChecked();
    await legend.getByRole("button", { name: /^Work, 2 notes/ }).click();

    const folderChips = page.getByRole("main").getByRole("group", { name: "Folder" });
    await expect(folderChips.getByRole("button", { name: "Work" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
  } finally {
    await deleteUserByEmail(email);
  }
});
