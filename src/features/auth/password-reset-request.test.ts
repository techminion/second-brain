import { headers } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { getRequestOrigin, requestPasswordReset } from "./password-reset-request";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/shared/lib/supabase-server-action-client");

const resetPasswordMock = vi.fn();

function stubHeaders(values: Record<string, string | null>): void {
  vi.mocked(headers).mockResolvedValue({
    get: (name: string) => values[name] ?? null,
  } as unknown as Awaited<ReturnType<typeof headers>>);
}

function stubSupabaseReset(result: { error: { message: string } | null }): void {
  resetPasswordMock.mockResolvedValue(result);
  vi.mocked(createServerActionSupabaseClient).mockResolvedValue({
    auth: { resetPasswordForEmail: resetPasswordMock },
  } as unknown as Awaited<ReturnType<typeof createServerActionSupabaseClient>>);
}

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubHeaders({ host: "localhost:3000", origin: "http://localhost:3000" });
  });

  it("derives a same-origin callback URL and requests a reset email", async () => {
    stubSupabaseReset({ error: null });

    const result = await requestPasswordReset({ email: "person@example.com" });

    expect(resetPasswordMock).toHaveBeenCalledWith("person@example.com", {
      redirectTo: "http://localhost:3000/auth/recovery/callback",
    });
    expect(result).toEqual({
      message: "If an account exists for that email, we sent a link to reset its password.",
      ok: true,
    });
  });

  it("re-validates input server-side", async () => {
    stubSupabaseReset({ error: null });

    const result = await requestPasswordReset({ email: "not-an-email" });

    expect(resetPasswordMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, reason: "invalid-input" });
  });

  it("returns a generic failure for Supabase errors", async () => {
    stubSupabaseReset({ error: { message: "Email address not authorized" } });

    const result = await requestPasswordReset({ email: "person@example.com" });

    expect(result).toEqual({
      message: "Could not request a password reset. Please try again.",
      ok: false,
      reason: "unknown",
    });
  });

  it("rejects a mismatched request origin and host", async () => {
    stubHeaders({ host: "second-brain.example", origin: "https://attacker.example" });
    stubSupabaseReset({ error: null });

    await expect(getRequestOrigin()).rejects.toThrow("Invalid request origin");
    expect(await requestPasswordReset({ email: "person@example.com" })).toMatchObject({
      ok: false,
      reason: "unknown",
    });
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("honors a trusted forwarded host and protocol only when the origin matches", async () => {
    stubHeaders({
      host: "internal.vercel",
      origin: "https://preview.example",
      "x-forwarded-host": "preview.example",
      "x-forwarded-proto": "https",
    });

    await expect(getRequestOrigin()).resolves.toBe("https://preview.example");
  });
});
