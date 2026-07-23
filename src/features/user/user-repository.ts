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

  async softDeleteAllKnowledgeObjects(userId: string): Promise<void> {
    const { error } = await this.client
      .from("knowledge_objects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("owner_id", userId)
      .is("deleted_at", null);

    if (error) {
      throw new Error("Unable to soft-delete knowledge objects during account deletion", {
        cause: error,
      });
    }
  }

  async revokeAllMcpCredentials(userId: string): Promise<void> {
    const { error } = await this.client
      .from("mcp_credentials")
      .update({ revoked_at: new Date().toISOString() })
      .eq("owner_id", userId)
      .is("revoked_at", null);

    if (error) {
      throw new Error("Unable to revoke MCP credentials during account deletion", {
        cause: error,
      });
    }
  }

  async requestAccountDeletion(userId: string): Promise<void> {
    const { error } = await this.client
      .from("profiles")
      .update({ delete_requested_at: new Date().toISOString() })
      .eq("id", userId)
      .is("delete_requested_at", null);

    if (error) {
      throw new Error("Unable to mark account for deletion", { cause: error });
    }
  }
}
