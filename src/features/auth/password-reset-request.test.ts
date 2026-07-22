import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { requestPasswordReset } from "./password-reset-request";
import { getRequestOrigin } from "./request-origin";

vi.mock("@/shared/lib/supabase-server-action-client");
vi.mock("./request-origin");

const resetPasswordMock = vi.fn();

function stubSupabaseReset(result: { error: { message: string } | null }): void {
  resetPasswordMock.mockResolvedValue(result);
  vi.mocked(createServerActionSupabaseClient).mockResolvedValue({
    auth: { resetPasswordForEmail: resetPasswordMock },
  } as unknown as Awaited<ReturnType<typeof createServerActionSupabaseClient>>);
}

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestOrigin).mockResolvedValue("http://localhost:3000");
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
    vi.mocked(getRequestOrigin).mockRejectedValue(new Error("Invalid request origin"));
    stubSupabaseReset({ error: null });

    expect(await requestPasswordReset({ email: "person@example.com" })).toMatchObject({
      ok: false,
      reason: "unknown",
    });
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });
});
