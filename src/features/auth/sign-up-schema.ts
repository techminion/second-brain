import { z } from "zod";

import { passwordSchema } from "./password-schema";

export const signUpSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: passwordSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
