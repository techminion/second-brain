import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProfileRecord, VerifiedProfileIdentity } from "@/features/user/types";

interface ProfileRow {
  created_at: string;
  display_name: string | null;
  id: string;
}

function mapProfileRow(row: ProfileRow): ProfileRecord {
  return {
    createdAt: row.created_at,
    displayName: row.display_name,
    id: row.id,
  };
}

export class UserRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getProfile(userId: string): Promise<ProfileRecord> {
    const { data, error } = await this.client
      .from("profiles")
      .select("id, display_name, created_at")
      .eq("id", userId)
      .single();

    if (error || !data) {
      throw new Error("Unable to read user profile", { cause: error ?? undefined });
    }

    return mapProfileRow(data as ProfileRow);
  }

  async getVerifiedIdentity(userId: string): Promise<VerifiedProfileIdentity> {
    const { data, error } = await this.client.auth.getClaims();
    const { claims } = data ?? {};

    if (
      error ||
      typeof claims?.sub !== "string" ||
      claims.sub !== userId ||
      typeof claims.email !== "string"
    ) {
      throw new Error("Unable to resolve verified profile identity", {
        cause: error ?? undefined,
      });
    }

    return { email: claims.email, id: claims.sub };
  }

  async updateProfile(userId: string, displayName: string | null): Promise<ProfileRecord> {
    const { data, error } = await this.client
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", userId)
      .select("id, display_name, created_at")
      .single();

    if (error || !data) {
      throw new Error("Unable to update user profile", { cause: error ?? undefined });
    }

    return mapProfileRow(data as ProfileRow);
  }
}
