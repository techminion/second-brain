import { describe, expect, it } from "vitest";

import { passwordResetSchema } from "./password-reset-schema";

describe("passwordResetSchema", () => {
  it("accepts matching passwords within the policy bounds", () => {
    expect(
      passwordResetSchema.safeParse({
        confirmPassword: "long-enough-password",
        password: "long-enough-password",
      }).success,
    ).toBe(true);
  });

  it("applies the shared password length policy", () => {
    const result = passwordResetSchema.safeParse({
      confirmPassword: "short",
      password: "short",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Password must be at least 8 characters.");
  });

  it("rejects a mismatched confirmation", () => {
    const result = passwordResetSchema.safeParse({
      confirmPassword: "different-password",
      password: "long-enough-password",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Passwords do not match.");
  });
});
