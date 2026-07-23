import type {
  Profile,
  ProfileRecord,
  UpdateProfileInput,
  VerifiedProfileIdentity,
} from "@/features/user/types";
import { UserRepository } from "@/features/user/user-repository";
import { ValidationError } from "@/shared/lib/errors";
import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

type UserRepositoryContract = Pick<
  UserRepository,
  | "getProfile"
  | "getVerifiedIdentity"
  | "updateProfile"
  | "softDeleteAllKnowledgeObjects"
  | "revokeAllMcpCredentials"
  | "requestAccountDeletion"
>;

function mapProfile(record: ProfileRecord, identity: VerifiedProfileIdentity): Profile {
  return {
    createdAt: record.createdAt,
    displayName: record.displayName,
    email: identity.email,
    id: record.id,
  };
}

function normalizeDisplayName(displayName: string): string | null {
  const normalized = displayName.trim();

  if (normalized.length === 0) {
    return null;
  }

  if ([...normalized].length > 80) {
    throw new ValidationError("Display name must be 80 characters or fewer");
  }

  return normalized;
}

export class UserService {
  constructor(private readonly repository: UserRepositoryContract) {}

  async getProfile(userId: string): Promise<Profile> {
    const identity = await this.repository.getVerifiedIdentity(userId);
    const profile = await this.repository.getProfile(userId);

    return mapProfile(profile, identity);
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.repository.softDeleteAllKnowledgeObjects(userId);
    await this.repository.revokeAllMcpCredentials(userId);
    await this.repository.requestAccountDeletion(userId);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
    if (input.displayName === undefined) {
      const identity = await this.repository.getVerifiedIdentity(userId);
      const profile = await this.repository.getProfile(userId);
      return mapProfile(profile, identity);
    }

    if (typeof input.displayName !== "string") {
      throw new ValidationError("Display name must be a string");
    }

    const displayName = normalizeDisplayName(input.displayName);
    const identity = await this.repository.getVerifiedIdentity(userId);
    const profile = await this.repository.updateProfile(userId, displayName);

    return mapProfile(profile, identity);
  }
}

export async function createUserService(): Promise<UserService> {
  const client = await createServerActionSupabaseClient();
  return new UserService(new UserRepository(client));
}
