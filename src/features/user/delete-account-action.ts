"use server";

import { redirect } from "next/navigation";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { createUserService } from "./user-service";

export type DeleteAccountResult = { ok: false; message: string };

export async function deleteAccountAction(): Promise<DeleteAccountResult> {
  const client = await createServerActionSupabaseClient();
  const { data, error } = await client.auth.getClaims();

  if (error || typeof data?.claims.sub !== "string") {
    return { ok: false, message: "Not authenticated." };
  }

  const userId = data.claims.sub;

  try {
    const service = await createUserService();
    await service.deleteAccount(userId);
  } catch {
    return { ok: false, message: "Could not schedule account deletion. Please try again." };
  }

  await client.auth.signOut({ scope: "local" });

  redirect("/login");
}
