import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBrowserSupabaseClient } from "@/shared/lib/supabase-browser-client";

import { signInWithPassword } from "./sign-in";

vi.mock("@/shared/lib/supabase-browser-client");

const signInMock = vi.fn();

function stubSupabaseSignIn(result: {
  data: { session: object | null };
  error: { code?: string; message: string } | null;
}): void {
  signInMock.mockResolvedValue(result);
  vi.mocked(createBrowserSupabaseClient).mockReturnValue({
    auth: { signInWithPassword: signInMock },
  } as unknown as ReturnType<typeof createBrowserSupabaseClient>);
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
