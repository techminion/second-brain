import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { signInWithPassword } from "./sign-in";

vi.mock("@/shared/lib/supabase-server-action-client");

const signInMock = vi.fn();

function stubSupabaseSignIn(result: {
  data: { session: object | null };
  error: { code?: string; message: string } | null;
}): void {
  signInMock.mockResolvedValue(result);
  vi.mocked(createServerActionSupabaseClient).mockResolvedValue({
    auth: { signInWithPassword: signInMock },
  } as unknown as Awaited<ReturnType<typeof createServerActionSupabaseClient>>);
}

describe("signInWithPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the credentials to Supabase Auth and succeeds with a session", async () => {
    stubSupabaseSignIn({ data: { session: {} }, error: null });

    const result = await signInWithPassword({
      email: "person@example.com",
      password: "long-enough-password",
    });

    expect(signInMock).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "long-enough-password",
    });
    expect(result).toEqual({ ok: true });
  });

  it("re-validates input server-side and never calls Supabase for invalid input", async () => {
    stubSupabaseSignIn({ data: { session: {} }, error: null });

    const result = await signInWithPassword({
      email: "not-an-email",
      password: "whatever",
    });

    expect(signInMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      message: "Enter a valid email address.",
      ok: false,
      reason: "invalid-input",
    });
  });

  it("maps credential mismatch to one neutral message", async () => {
    stubSupabaseSignIn({
      data: { session: null },
      error: { code: "invalid_credentials", message: "Invalid login credentials" },
    });

    const result = await signInWithPassword({
      email: "person@example.com",
      password: "wrong-password",
    });

    expect(result).toEqual({
      message: "Incorrect email or password.",
      ok: false,
      reason: "invalid-credentials",
    });
  });

  it("returns a generic failure for unrecognized errors", async () => {
    stubSupabaseSignIn({
      data: { session: null },
      error: { message: "fetch failed" },
    });

    const result = await signInWithPassword({
      email: "person@example.com",
      password: "long-enough-password",
    });

    expect(result).toMatchObject({ ok: false, reason: "unknown" });
  });

  it("treats a missing session as a failure", async () => {
    stubSupabaseSignIn({ data: { session: null }, error: null });

    const result = await signInWithPassword({
      email: "person@example.com",
      password: "long-enough-password",
    });

    expect(result).toMatchObject({ ok: false, reason: "unknown" });
  });
});
