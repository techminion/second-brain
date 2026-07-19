import { expect, test } from "@playwright/test";

test("redirects unauthenticated visitors away from the application shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});
