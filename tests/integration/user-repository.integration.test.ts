import { describe, expect, it } from "vitest";

import { UserRepository } from "@/features/user/user-repository";

import { createCloudIntegrationTestHarness } from "./supabase-test-harness";

describe("UserRepository", () => {
  const { userA, userB } = createCloudIntegrationTestHarness();

  it("reads and updates a profile through the authenticated Data API", async () => {
    const repository = new UserRepository(userA.client);
    const initialProfile = await repository.getProfile(userA.id);

    expect(initialProfile).toMatchObject({
      displayName: null,
      id: userA.id,
    });
    expect(Number.isNaN(Date.parse(initialProfile.createdAt))).toBe(false);

    await expect(repository.updateProfile(userA.id, "Cloud Profile")).resolves.toMatchObject({
      displayName: "Cloud Profile",
      id: userA.id,
    });

    await expect(repository.getProfile(userA.id)).resolves.toMatchObject({
      displayName: "Cloud Profile",
    });
  });

  it("fails closed when RLS hides a different user's profile", async () => {
    const repository = new UserRepository(userB.client);

    await expect(repository.getProfile(userA.id)).rejects.toThrow("Unable to read user profile");
  });
});
