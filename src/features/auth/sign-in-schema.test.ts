import { describe, expect, it } from "vitest";

import { signInSchema } from "./sign-in-schema";

describe("signInSchema", () => {
  it("accepts a valid email and any non-empty password", () => {
    const result = signInSchema.safeParse({
      email: "person@example.com",
      password: "x",
    });

    expect(result.success).toBe(true);
  });

  it("does not apply signup strength rules on login", () => {
    const result = signInSchema.safeParse({
      email: "person@example.com",
      password: "1234567",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = signInSchema.safeParse({
      email: "not-an-email",
      password: "whatever",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter a valid email address.");
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({
      email: "person@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter your password.");
  });
});
