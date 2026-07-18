import { z } from "zod";

/**
 * Login deliberately validates only shape, not strength: the server is the
 * authority on whether credentials match, and strength rules on login would
 * lock out accounts created under earlier policies.
 */
export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type SignInInput = z.infer<typeof signInSchema>;
