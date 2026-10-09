import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

import { deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

// UX-10: the mobile light pass at 390x844 with touch (the "mobile" project in
// playwright.config.ts). Every lookup is scoped to the top bar, the drawer or
// the note header, so Home's quick actions and recent notes can't match.
const password = "Correct-Horse-42-Battery";
const noteUrl = /\/notes\/[0-9a-f-]+$/;

async function signUp(page: Page, email: string): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("/");
}

async function countNotes(page: Page): Promise<number> {
  const response = await page.request.get("/api/notes");
  const { data } = (await response.json()) as { data: { items: unknown[] } };
  return data.items.length;
}

function topBar(page: Page): Locator {
  return page.getByRole("main").getByRole("region", { name: "Top bar" });
}

function drawer(page: Page): Locator {
  return page.getByRole("dialog", { name: "Application sidebar" });
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test("top bar New note, drawer behaviour and a compact note header", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");
  test.setTimeout(90_000);
  const email = `ameybro11+mobile${Date.now()}@gmail.com`;

  try {
    await signUp(page, email);

    // AC2: New note from the top bar; a double tap creates exactly one.
    const before = await countNotes(page);
    const newNote = topBar(page).getByRole("button", { name: "New note" });
    await newNote.dblclick();
    await page.waitForURL(noteUrl);
    await expect.poll(() => countNotes(page)).toBe(before + 1);
    const noteId = page.url().split("/").pop() ?? "";
    await page.getByLabel("Note title").fill("Mobile note");
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeAttached({
      timeout: 10_000,
    });

    // First load of a note page (UX-10 review): no drawer, no scroll lock, and
    // focus is not pulled to a drawer toggle.
    await page.reload();
    await page.getByLabel("Note title").waitFor();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    const focusedName = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-label") ?? "",
    );
    expect(focusedName).not.toMatch(/context panel|application sidebar/);

    // AC1/AC3: the top bar is 48px; header controls don't overlap each other or
    // the top bar, and nothing scrolls sideways.
    const bar = await topBar(page).boundingBox();
    expect(bar?.height).toBe(48);
    const header = page.getByRole("main").locator("article header");
    const controls = [
      header.getByRole("button", { name: /^Folder/ }),
      header.getByRole("status"),
      header.getByRole("button", { name: "Note actions" }),
    ];
    const boxes = await Promise.all(controls.map((control) => control.boundingBox()));
    for (const [i, box] of boxes.entries()) {
      expect(box).not.toBeNull();
      expect(overlaps(box!, bar!)).toBe(false);
      for (const other of boxes.slice(i + 1)) {
        expect(overlaps(box!, other!)).toBe(false);
      }
    }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);

    // AC5: 44px targets on a coarse pointer.
    const coarse = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
    if (coarse) {
      for (const target of [
        topBar(page).getByRole("button", { name: "Expand application sidebar" }),
        newNote,
        header.getByRole("button", { name: "Note actions" }),
      ]) {
        const box = await target.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(box?.width).toBeGreaterThanOrEqual(44);
      }
    }

    // AC4: open the drawer, focus moves in, Escape closes and returns focus.
    const toggle = topBar(page).getByRole("button", { name: "Expand application sidebar" });
    await toggle.click();
    await expect(drawer(page)).toBeVisible();
    await expect(drawer(page)).toHaveAttribute("aria-modal", "true");
    expect(await drawer(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await page.keyboard.press("Escape");
    await expect(drawer(page)).toHaveCount(0);
    await expect(toggle).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

    // Tapping a note link in the drawer closes it and shows the note.
    await page.goto("/");
    await topBar(page).getByRole("button", { name: "Expand application sidebar" }).click();
    await drawer(page)
      .getByRole("navigation", { name: "Notes" })
      .getByRole("link", { name: /Mobile note/ })
      .click();
    await page.waitForURL(`/notes/${noteId}`);
    await expect(drawer(page)).toHaveCount(0);
    await expect(page.getByLabel("Note title")).toHaveValue("Mobile note");
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await expect(
      topBar(page).getByRole("button", { name: "Expand application sidebar" }),
    ).not.toBeFocused();
  } finally {
    await deleteUserByEmail(email);
  }
});

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.length }))).toEqual([]);
}

async function expectNoViolationsInBothThemes(page: Page): Promise<void> {
  await expectNoViolations(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  try {
    await expectNoViolations(page);
  } finally {
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await page.emulateMedia({ reducedMotion: null });
  }
}

test("@a11y mobile routes have no WCAG 2.1 AA violations in either theme", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");
  test.setTimeout(90_000);
  const email = `ameybro11+mobile-a11y${Date.now()}@gmail.com`;

  try {
    await signUp(page, email);
    const created = await page.request.post("/api/notes", {
      data: { body: "A short body.", title: "Mobile a11y" },
    });
    const { data: note } = (await created.json()) as { data: { id: string } };

    await page.goto("/");
    await topBar(page).waitFor();
    await expectNoViolationsInBothThemes(page);

    await page.goto(`/notes/${note.id}`);
    await page.getByLabel("Note body").waitFor();
    await expectNoViolationsInBothThemes(page);

    await page.goto("/search?q=short");
    await page.getByRole("main").getByRole("list", { name: "Search results" }).waitFor();
    await expectNoViolationsInBothThemes(page);

    await page.goto("/settings");
    await page.getByRole("main").getByRole("heading", { level: 1 }).waitFor();
    await expectNoViolationsInBothThemes(page);
  } finally {
    await deleteUserByEmail(email);
  }
});
