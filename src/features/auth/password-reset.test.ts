import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { resetPassword } from "./password-reset";

vi.mock("@/shared/lib/supabase-server-action-client");

const getClaimsMock = vi.fn();
const updateUserMock = vi.fn();

function stubSupabase(options?: {
  claims?: { sub?: string } | null;
  claimsError?: { message: string } | null;
  updateError?: { code?: string; message: string } | null;
}): void {
  getClaimsMock.mockResolvedValue({
    data: options?.claims === null ? null : { claims: options?.claims ?? { sub: "user-id" } },
    error: options?.claimsError ?? null,
  });
  updateUserMock.mockResolvedValue({ error: options?.updateError ?? null });
  vi.mocked(createServerActionSupabaseClient).mockResolvedValue({
    auth: { getClaims: getClaimsMock, updateUser: updateUserMock },
  } as unknown as Awaited<ReturnType<typeof createServerActionSupabaseClient>>);
}

describe("resetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies the recovery session and updates the password", async () => {
    stubSupabase();

    const result = await resetPassword({
      confirmPassword: "new-secure-password",
      password: "new-secure-password",
    });

    expect(getClaimsMock).toHaveBeenCalledTimes(1);
    expect(updateUserMock).toHaveBeenCalledWith({ password: "new-secure-password" });
    expect(result).toEqual({ ok: true });
  });

  it("re-validates input before reading the session", async () => {
    stubSupabase();

    const result = await resetPassword({ confirmPassword: "different", password: "short" });

    expect(getClaimsMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, reason: "invalid-input" });
  });

  it("fails closed without verified claims", async () => {
    stubSupabase({ claims: null });

    const result = await resetPassword({
      confirmPassword: "new-secure-password",
      password: "new-secure-password",
    });

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      message: "Request a new password reset link and try again.",
      ok: false,
      reason: "invalid-session",
    });
  });

  it("preserves Supabase's weak-password guidance", async () => {
    stubSupabase({
      updateError: { code: "weak_password", message: "Password is known to be weak" },
    });

    const result = await resetPassword({
      confirmPassword: "new-secure-password",
      password: "new-secure-password",
    });

    expect(result).toEqual({
      message: "Password is known to be weak",
      ok: false,
      reason: "weak-password",
    });
  });

  it("maps an expired session and unknown errors safely", async () => {
    stubSupabase({ updateError: { code: "session_not_found", message: "Session not found" } });
    const expired = await resetPassword({
      confirmPassword: "new-secure-password",
      password: "new-secure-password",
    });

    expect(expired).toMatchObject({ ok: false, reason: "invalid-session" });

    stubSupabase({ updateError: { message: "fetch failed" } });
    const unknown = await resetPassword({
      confirmPassword: "new-secure-password",
      password: "new-secure-password",
    });

    expect(unknown).toMatchObject({ ok: false, reason: "unknown" });
  });
});
