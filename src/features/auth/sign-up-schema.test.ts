import { describe, expect, it } from "vitest";

import { signUpSchema } from "./sign-up-schema";

describe("signUpSchema", () => {
  it("accepts a valid email and an 8-character password", () => {
    const result = signUpSchema.safeParse({
      email: "person@example.com",
      password: "12345678",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = signUpSchema.safeParse({
      email: "not-an-email",
      password: "12345678",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter a valid email address.");
  });

  it("rejects a password shorter than the ADR-19 minimum", () => {
    const result = signUpSchema.safeParse({
      email: "person@example.com",
      password: "1234567",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Password must be at least 8 characters.");
  });

  it("rejects a password longer than the bcrypt limit", () => {
    const result = signUpSchema.safeParse({
      email: "person@example.com",
      password: "a".repeat(73),
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Password must be at most 72 characters.");
  });
});
