import { describe, expect, it } from "vitest";

import { passwordResetRequestSchema } from "./password-reset-request-schema";

describe("passwordResetRequestSchema", () => {
  it("accepts a valid email", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "person@example.com" }).success).toBe(
      true,
    );
  });

  it("rejects an invalid email", () => {
    const result = passwordResetRequestSchema.safeParse({ email: "not-an-email" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter a valid email address.");
  });
});
