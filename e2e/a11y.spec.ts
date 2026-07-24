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
  } finally {
    await deleteUserByEmail(email);
  }
});
