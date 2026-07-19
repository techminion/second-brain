import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { signUpWithPassword } from "./sign-up";

vi.mock("@/shared/lib/supabase-server-action-client");

const signUpMock = vi.fn();

function stubSupabaseSignUp(result: {
  data: { session: object | null };
  error: { code?: string; message: string } | null;
}): void {
  signUpMock.mockResolvedValue(result);
  vi.mocked(createServerActionSupabaseClient).mockResolvedValue({
    auth: { signUp: signUpMock },
  } as unknown as Awaited<ReturnType<typeof createServerActionSupabaseClient>>);
}

describe("signUpWithPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the email and password to Supabase Auth and succeeds with a session", async () => {
    stubSupabaseSignUp({ data: { session: {} }, error: null });

    const result = await signUpWithPassword({
      email: "person@example.com",
      password: "long-enough-password",
    });

    expect(signUpMock).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "long-enough-password",
    });
    expect(result).toEqual({ ok: true });
  });

  it("re-validates input server-side and never calls Supabase for invalid input", async () => {
    stubSupabaseSignUp({ data: { session: {} }, error: null });

    const result = await signUpWithPassword({
      email: "person@example.com",
      password: "1234567",
    });

    expect(signUpMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      message: "Password must be at least 8 characters.",
      ok: false,
      reason: "invalid-input",
    });
  });

  it("maps the existing-email error to a stable reason", async () => {
    stubSupabaseSignUp({
      data: { session: null },
      error: { code: "user_already_exists", message: "User already registered" },
    });

    const result = await signUpWithPassword({
      email: "person@example.com",
      password: "long-enough-password",
    });

    expect(result).toMatchObject({ ok: false, reason: "email-taken" });
  });

  it("surfaces the server's weak-password message", async () => {
    stubSupabaseSignUp({
      data: { session: null },
      error: { code: "weak_password", message: "Password should be at least 8 characters." },
    });

    const result = await signUpWithPassword({
      email: "person@example.com",
      password: "long-enough-password",
    });

    expect(result).toEqual({
      message: "Password should be at least 8 characters.",
      ok: false,
      reason: "weak-password",
    });
  });

  it("returns a generic failure for unrecognized errors", async () => {
    stubSupabaseSignUp({
      data: { session: null },
      error: { message: "fetch failed" },
    });

    const result = await signUpWithPassword({
      email: "person@example.com",
      password: "long-enough-password",
    });

    expect(result).toMatchObject({ ok: false, reason: "unknown" });
  });

  it("treats a missing session as a failure (email-confirmation drift guard)", async () => {
    stubSupabaseSignUp({ data: { session: null }, error: null });

    const result = await signUpWithPassword({
      email: "person@example.com",
      password: "long-enough-password",
    });

    expect(result).toMatchObject({ ok: false, reason: "unknown" });
  });
});
