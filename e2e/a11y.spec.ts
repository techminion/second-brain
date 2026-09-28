import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

// CI-08: axe checks on core routes (10_DESIGN §6, WCAG 2.1 AA). The `@a11y`
// tag lets CI run these in their own job (--grep @a11y) while the functional
// E2E job excludes them (--grep-invert @a11y); `npm run test:e2e` runs both.
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

interface ViolationSummary {
  id: string;
  impact: string | null | undefined;
  nodes: number;
  help: string;
}

async function expectNoViolations(page: Parameters<typeof AxeBuilder>[0]["page"]): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

  const summaries: ViolationSummary[] = results.violations.map((violation) => ({
    help: violation.help,
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
  }));

  expect(summaries).toEqual([]);
}

for (const route of ["/login", "/signup", "/forgot-password"]) {
  test(`@a11y ${route} has no WCAG 2.1 AA violations`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");

    await expectNoViolations(page);
  });
}

test("@a11y authenticated shell and settings have no WCAG 2.1 AA violations", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");
  // This sweep visits ~8 authenticated routes in one session; the default 30s
  // budget is too tight once each route's first render is counted.
  test.setTimeout(90_000);

  const email = `ameybro11+a11y${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    await expectNoViolations(page);

    await page.goto("/settings");
    await page.getByRole("heading", { name: "Account settings" }).waitFor();

    await expectNoViolations(page);

    // NOTE-10 note editor page. Seed a note through the authenticated Web API
    // (the browser context's session cookies ride along), then axe the route.
    const created = await page.request.post("/api/notes", {
      data: { title: "Accessibility note", body: "A short body for the a11y sweep." },
    });
    expect(created.ok()).toBeTruthy();
    const { data: note } = (await created.json()) as { data: { id: string } };

    await page.goto(`/notes/${note.id}`);
    await page.getByLabel("Note body").waitFor();

    await expectNoViolations(page);

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").waitFor();

    await expectNoViolations(page);

    // FOLD-06..14 folder tree + folder page (empty-folder state).
    const folder = await page.request.post("/api/folders", { data: { name: "Accessible" } });
    expect(folder.ok()).toBeTruthy();
    const { data: folderData } = (await folder.json()) as { data: { id: string } };

    await page.goto(`/folders/${folderData.id}`);
    await page.getByText("This folder is empty.").waitFor();

    await expectNoViolations(page);

    // TAG-04..07 tag chips/input on the note, then the tag browse page.
    const tagged = await page.request.post(`/api/notes/${note.id}/tags`, {
      data: { name: "a11y" },
    });
    expect(tagged.ok()).toBeTruthy();
    const { data: taggedNote } = (await tagged.json()) as {
      data: { tags: { id: string }[] };
    };

    await page.goto(`/tags/${taggedNote.tags[0].id}`);
    await page.getByRole("list", { name: "Tagged items" }).waitFor();

    await expectNoViolations(page);

    // GRAPH-04/11 graph canvas + synchronized notes list.
    await page.goto("/graph");
    await page.getByRole("navigation", { name: "Notes in graph" }).waitFor();

    await expectNoViolations(page);

    // NOTE-12 trash view, with the note just seeded moved into it.
    const deleted = await page.request.delete(`/api/notes/${note.id}`);
    expect(deleted.ok()).toBeTruthy();

    await page.goto("/trash");
    await page.getByRole("list", { name: "Deleted notes" }).waitFor();

    await expectNoViolations(page);
  } finally {
    await deleteUserByEmail(email);
  }
});
