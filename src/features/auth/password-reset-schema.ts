import { z } from "zod";

import { passwordSchema } from "./password-schema";

export const passwordResetSchema = z
  .object({
    confirmPassword: z.string(),
    password: passwordSchema,
  })
  .refine(({ confirmPassword, password }) => confirmPassword === password, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
