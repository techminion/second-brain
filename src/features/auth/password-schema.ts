import { z } from "zod";

/**
 * Password bounds mirror the server-side policy: minimum 8 per ADR-19
 * (Supabase dashboard setting, supabase/auth-config.md), maximum 72 because
 * bcrypt ignores everything past 72 bytes.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");
