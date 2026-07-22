import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { UserRepository } from "@/features/user/user-repository";

function createClaimsClient(claims: Record<string, unknown>) {
  const getClaims = vi.fn().mockResolvedValue({ data: { claims }, error: null });
  const client = { auth: { getClaims } } as unknown as SupabaseClient;

  return { client, getClaims };
}

describe("UserRepository verified identity", () => {
  it("returns email only when it belongs to the requested verified subject", async () => {
    const { client, getClaims } = createClaimsClient({
      email: "user@example.com",
      sub: "user-id",
    });
    const repository = new UserRepository(client);

    await expect(repository.getVerifiedIdentity("user-id")).resolves.toEqual({
      email: "user@example.com",
      id: "user-id",
    });
    expect(getClaims).toHaveBeenCalledOnce();
  });

  it("fails closed when the verified subject differs from the requested user", async () => {
    const { client } = createClaimsClient({
      email: "user@example.com",
      sub: "different-user-id",
    });
    const repository = new UserRepository(client);

    await expect(repository.getVerifiedIdentity("user-id")).rejects.toThrow(
      "Unable to resolve verified profile identity",
    );
  });

  it("fails closed when the verified session has no email", async () => {
    const { client } = createClaimsClient({ sub: "user-id" });
    const repository = new UserRepository(client);

    await expect(repository.getVerifiedIdentity("user-id")).rejects.toThrow(
      "Unable to resolve verified profile identity",
    );
  });
});
