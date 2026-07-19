import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { resolveSessionUserId } from "./resolve-user-id";

vi.mock("@/shared/lib/supabase-server-action-client");

const getClaimsMock = vi.fn();

function stubClaims(result: unknown): void {
  getClaimsMock.mockResolvedValue(result);
  vi.mocked(createServerActionSupabaseClient).mockResolvedValue({
    auth: { getClaims: getClaimsMock },
  } as unknown as Awaited<ReturnType<typeof createServerActionSupabaseClient>>);
}

describe("resolveSessionUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the verified subject claim", async () => {
    stubClaims({
      data: { claims: { sub: "d2b8a9c4-1111-4222-8333-444455556666" } },
      error: null,
    });

    await expect(resolveSessionUserId()).resolves.toBe("d2b8a9c4-1111-4222-8333-444455556666");
  });

  it("returns null for anonymous requests", async () => {
    stubClaims({ data: null, error: null });

    await expect(resolveSessionUserId()).resolves.toBeNull();
  });

  it("returns null when claims verification fails", async () => {
    stubClaims({ data: null, error: { message: "invalid JWT" } });

    await expect(resolveSessionUserId()).resolves.toBeNull();
  });

  it("returns null when the client cannot be constructed", async () => {
    vi.mocked(createServerActionSupabaseClient).mockRejectedValue(
      new Error("cookies called outside request scope"),
    );

    await expect(resolveSessionUserId()).resolves.toBeNull();
  });
});
