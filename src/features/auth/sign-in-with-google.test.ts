import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { getRequestOrigin } from "./request-origin";
import { signInWithGoogle } from "./sign-in-with-google";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/shared/lib/supabase-server-action-client");
vi.mock("./request-origin");

const signInWithOAuthMock = vi.fn();

function stubSupabaseOAuth(result: {
  data: { url: string | null };
  error: { message: string } | null;
}): void {
  signInWithOAuthMock.mockResolvedValue(result);
  vi.mocked(createServerActionSupabaseClient).mockResolvedValue({
    auth: { signInWithOAuth: signInWithOAuthMock },
  } as unknown as Awaited<ReturnType<typeof createServerActionSupabaseClient>>);
}

describe("signInWithGoogle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestOrigin).mockResolvedValue("http://localhost:3000");
  });

  it("starts the fixed Google PKCE flow and redirects to Supabase", async () => {
    stubSupabaseOAuth({
      data: { url: "https://project.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    });

    await signInWithGoogle();

    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      options: { redirectTo: "http://localhost:3000/auth/oauth/callback" },
      provider: "google",
    });
    expect(redirect).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/authorize?provider=google",
    );
  });

  it("redirects provider failures to a fixed generic error", async () => {
    stubSupabaseOAuth({ data: { url: null }, error: { message: "Provider disabled" } });

    await signInWithGoogle();

    expect(redirect).toHaveBeenCalledWith("/login?error=oauth");
  });

  it("fails closed when the request origin cannot be verified", async () => {
    vi.mocked(getRequestOrigin).mockRejectedValue(new Error("Invalid request origin"));

    await signInWithGoogle();

    expect(createServerActionSupabaseClient).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/login?error=oauth");
  });
});
