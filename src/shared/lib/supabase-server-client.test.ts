import { describe, expect, it } from "vitest";

import { hardenSessionCookieOptions } from "@/shared/lib/supabase-server-client";

describe("hardenSessionCookieOptions", () => {
  it("forces the 09_SECURITY §3 flags regardless of what the caller passed", () => {
    const hardened = hardenSessionCookieOptions({
      httpOnly: false,
      sameSite: "none",
      secure: true,
    });

    expect(hardened.httpOnly).toBe(true);
    expect(hardened.sameSite).toBe("lax");
    // Not production in tests — Secure would break plain-HTTP localhost.
    expect(hardened.secure).toBe(false);
  });

  it("preserves non-security options like path and maxAge", () => {
    const hardened = hardenSessionCookieOptions({ maxAge: 3600, path: "/" });

    expect(hardened.maxAge).toBe(3600);
    expect(hardened.path).toBe("/");
  });
});
