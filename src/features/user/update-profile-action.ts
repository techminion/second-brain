"use server";

import { ValidationError } from "@/shared/lib/errors";
import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import type { Profile } from "./types";
import { createUserService } from "./user-service";

export type UpdateProfileResult = { ok: true; profile: Profile } | { ok: false; message: string };

export async function updateProfileAction(input: {
  displayName: string;
}): Promise<UpdateProfileResult> {
  const client = await createServerActionSupabaseClient();
  const { data, error } = await client.auth.getClaims();

  if (error || typeof data?.claims.sub !== "string") {
    return { ok: false, message: "Not authenticated." };
  }

  const userId = data.claims.sub;

  try {
    const service = await createUserService();
    const profile = await service.updateProfile(userId, { displayName: input.displayName });
    return { ok: true, profile };
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: "Could not save your profile. Please try again." };
  }
}
