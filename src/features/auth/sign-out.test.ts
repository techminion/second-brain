import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { signOut } from "./sign-out";

vi.mock("@/shared/lib/supabase-server-action-client");
vi.mock("next/navigation", () => ({
  // Mirror Next's real contract: redirect() never returns, it throws.
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const signOutMock = vi.fn();

function stubSupabaseSignOut(result: { error: { message: string } | null }): void {
  signOutMock.mockResolvedValue(result);
  vi.mocked(createServerActionSupabaseClient).mockResolvedValue({
    auth: { signOut: signOutMock },
  } as unknown as Awaited<ReturnType<typeof createServerActionSupabaseClient>>);
}

describe("signOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes only the current session (ADR-22) and redirects to login", async () => {
    stubSupabaseSignOut({ error: null });

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");

    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to login even when server-side revocation fails", async () => {
    stubSupabaseSignOut({ error: { message: "network error" } });

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
