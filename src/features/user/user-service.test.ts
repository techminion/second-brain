import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import type { ProfileRecord, VerifiedProfileIdentity } from "@/features/user/types";
import { UserService } from "@/features/user/user-service";
import { ValidationError } from "@/shared/lib/errors";

interface MockUserRepository {
  getProfile: Mock<(userId: string) => Promise<ProfileRecord>>;
  getVerifiedIdentity: Mock<(userId: string) => Promise<VerifiedProfileIdentity>>;
  updateProfile: Mock<(userId: string, displayName: string | null) => Promise<ProfileRecord>>;
}

const profileRecord: ProfileRecord = {
  createdAt: "2026-07-22T00:00:00.000Z",
  displayName: null,
  id: "user-id",
};

const verifiedIdentity: VerifiedProfileIdentity = {
  email: "user@example.com",
  id: "user-id",
};

function createRepositoryMock(): MockUserRepository {
  return {
    getProfile: vi.fn(),
    getVerifiedIdentity: vi.fn(),
    updateProfile: vi.fn(),
  };
}

describe("UserService", () => {
  let repository: MockUserRepository;
  let service: UserService;

  beforeEach(() => {
    repository = createRepositoryMock();
    repository.getProfile.mockResolvedValue(profileRecord);
    repository.getVerifiedIdentity.mockResolvedValue(verifiedIdentity);
    service = new UserService(repository);
  });

  it("returns the profile with the verified session email", async () => {
    await expect(service.getProfile("user-id")).resolves.toEqual({
      createdAt: profileRecord.createdAt,
      displayName: null,
      email: verifiedIdentity.email,
      id: "user-id",
    });

    expect(repository.getVerifiedIdentity).toHaveBeenCalledWith("user-id");
    expect(repository.getProfile).toHaveBeenCalledWith("user-id");
  });

  it("trims and updates a display name", async () => {
    repository.updateProfile.mockResolvedValue({
      ...profileRecord,
      displayName: "Ada Lovelace",
    });

    await expect(
      service.updateProfile("user-id", { displayName: "  Ada Lovelace  " }),
    ).resolves.toEqual({
      createdAt: profileRecord.createdAt,
      displayName: "Ada Lovelace",
      email: verifiedIdentity.email,
      id: "user-id",
    });

    expect(repository.updateProfile).toHaveBeenCalledWith("user-id", "Ada Lovelace");
  });

  it("clears a whitespace-only display name", async () => {
    repository.updateProfile.mockResolvedValue(profileRecord);

    await service.updateProfile("user-id", { displayName: " \t\n " });

    expect(repository.updateProfile).toHaveBeenCalledWith("user-id", null);
  });

  it("leaves the profile unchanged when displayName is omitted", async () => {
    await expect(service.updateProfile("user-id", {})).resolves.toMatchObject({
      displayName: null,
      email: verifiedIdentity.email,
    });

    expect(repository.getProfile).toHaveBeenCalledWith("user-id");
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it("accepts an 80-character Unicode display name", async () => {
    const displayName = "🙂".repeat(80);
    repository.updateProfile.mockResolvedValue({ ...profileRecord, displayName });

    await expect(service.updateProfile("user-id", { displayName })).resolves.toMatchObject({
      displayName,
    });

    expect(repository.updateProfile).toHaveBeenCalledWith("user-id", displayName);
  });

  it("rejects display names longer than 80 characters before data access", async () => {
    const displayName = "🙂".repeat(81);

    await expect(service.updateProfile("user-id", { displayName })).rejects.toBeInstanceOf(
      ValidationError,
    );

    expect(repository.getVerifiedIdentity).not.toHaveBeenCalled();
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it("rejects a non-string display name before data access", async () => {
    const invalidInput = { displayName: null } as unknown as { displayName: string };

    await expect(service.updateProfile("user-id", invalidInput)).rejects.toBeInstanceOf(
      ValidationError,
    );

    expect(repository.getVerifiedIdentity).not.toHaveBeenCalled();
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });
});
