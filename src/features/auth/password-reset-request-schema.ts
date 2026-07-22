import { z } from "zod";

export const passwordResetRequestSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
