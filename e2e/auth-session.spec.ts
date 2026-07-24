import { expect, test } from "@playwright/test";

import { createAdminClient, deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

test("signup provisions an empty authenticated shell (FR-AUTH-5)", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires .env with dev-project credentials");

  const email = `ameybro11+provision${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    // Authenticated shell rendered — sidebar nav and logout control are visible.
    await expect(page.getByRole("navigation", { name: "Knowledge navigation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

    // No error state: no role="alert" on the landing page. Next.js mounts its
    // own route announcer with role="alert" in production builds — exclude it.
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveCount(0);
  } finally {
    await deleteUserByEmail(email);
  }
});

test("password recovery creates an HttpOnly session and updates the password", async ({
  context,
  page,
}) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires .env with dev-project credentials");

  const admin = createAdminClient();
  const email = `ameybro11+recovery${Date.now()}@gmail.com`;
  const oldPassword = "Correct-Horse-42-Battery";
  const newPassword = "Updated-Horse-43-Battery";

  try {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: oldPassword,
    });

    if (createError) {
      throw new Error(`e2e setup failed creating recovery user: ${createError.message}`);
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      email,
      type: "recovery",
    });

    if (linkError || !linkData.properties?.hashed_token) {
      throw new Error(`e2e setup failed generating recovery link: ${linkError?.message}`);
    }

    await page.goto(
      `/auth/recovery/callback?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=recovery`,
    );
    await page.waitForURL("/reset-password");

    const recoveryCookies = (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("sb-"),
    );
    expect(recoveryCookies.length).toBeGreaterThan(0);

    for (const cookie of recoveryCookies) {
      expect(cookie.httpOnly, `${cookie.name} must be HttpOnly`).toBe(true);
      expect(cookie.sameSite, `${cookie.name} must be SameSite=Lax`).toBe("Lax");
    }

    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await page.waitForURL("/");

    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(newPassword);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("/");
  } finally {
    await deleteUserByEmail(email);
  }
});

test("signup and login establish HttpOnly SameSite=Lax session cookies (ADR-20)", async ({
  context,
  page,
}) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires .env with dev-project credentials");

  const email = `ameybro11+e2e${Date.now()}@gmail.com`;
  const password = "Correct-Horse-42-Battery";

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    const signupCookies = (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("sb-"),
    );
    expect(signupCookies.length).toBeGreaterThan(0);

    for (const cookie of signupCookies) {
      expect(cookie.httpOnly, `${cookie.name} must be HttpOnly`).toBe(true);
      expect(cookie.sameSite, `${cookie.name} must be SameSite=Lax`).toBe("Lax");
    }

    // The browser's JavaScript must not see any session cookie at all.
    const documentCookie = await page.evaluate(() => document.cookie);
    expect(documentCookie).not.toContain("sb-");

    // Fresh context state: prove login re-establishes the session.
    await context.clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("/");

    const loginCookies = (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("sb-"),
    );
    expect(loginCookies.length).toBeGreaterThan(0);

    for (const cookie of loginCookies) {
      expect(cookie.httpOnly, `${cookie.name} must be HttpOnly`).toBe(true);
    }

    // SHELL-03 binds the visible control to AUTH-08's real server action.
    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL("/login");
    expect((await context.cookies()).some((cookie) => cookie.name.startsWith("sb-"))).toBe(false);
  } finally {
    await deleteUserByEmail(email);
  }
});
