import { expect, test } from "@playwright/test";

import { createAdminClient, deleteUserByEmail, serviceRoleKey, supabaseUrl } from "./support/admin";

interface AuditRow {
  action: string;
  actor: string;
  metadata: { fields?: string[] } | null;
}

// NOTE-13 (ADR-35): a note's lifecycle driven through the UI leaves one
// audit row per real change — written in the same transaction as the change,
// attributed to the user, and carrying field names only, never content.
test("records the note lifecycle in the audit log", async ({ page }) => {
  test.skip(!supabaseUrl || !serviceRoleKey, "requires dev-project credentials");

  const email = `ameybro11+note-audit${Date.now()}@gmail.com`;
  const secret = `Confidential body ${Date.now()}`;

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Correct-Horse-42-Battery");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");

    await page.getByRole("button", { name: "New note" }).click();
    await page.waitForURL(/\/notes\/[0-9a-f-]+$/);
    const noteId = page.url().split("/").pop() ?? "";

    await page.getByLabel("Note title").fill("Audited note");
    await page.getByRole("textbox", { name: "Note body" }).click();
    await page.keyboard.type(secret);
    await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete note" }).click();
    await page.waitForURL("/");
    await page.getByRole("link", { name: "Trash" }).click();
    await page.getByRole("button", { name: "Restore Audited note" }).click();
    await expect(page.getByText("Trash is empty.")).toBeVisible();

    // "Trash is empty" renders optimistically, before the restore request
    // settles; poll the log until the restore row has landed.
    const admin = createAdminClient();
    const readAudit = async (): Promise<AuditRow[]> => {
      const { data, error } = await admin
        .from("audit_log")
        .select("action, actor, metadata")
        .eq("knowledge_object_id", noteId)
        .order("created_at", { ascending: true });
      expect(error).toBeNull();
      return (data ?? []) as AuditRow[];
    };
    await expect
      .poll(async () => (await readAudit()).map((row) => row.action).at(-1))
      .toBe("restore");
    const rows = await readAudit();

    expect(rows.map((row) => row.action)).toEqual(
      expect.arrayContaining(["create", "update", "delete", "restore"]),
    );
    expect(rows[0].action).toBe("create");
    expect(rows.slice(-2).map((row) => row.action)).toEqual(["delete", "restore"]);
    expect(new Set(rows.map((row) => row.actor))).toEqual(new Set(["user"]));

    const updatedFields = new Set(
      rows.filter((row) => row.action === "update").flatMap((row) => row.metadata?.fields ?? []),
    );
    expect(updatedFields).toEqual(new Set(["title", "body"]));

    // Field names only — the audit log never carries note content (04_DATABASE §8).
    expect(JSON.stringify(rows)).not.toContain("Confidential");
    expect(JSON.stringify(rows)).not.toContain("Audited note");
  } finally {
    await deleteUserByEmail(email);
  }
});
