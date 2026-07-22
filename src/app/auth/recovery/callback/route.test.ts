import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionCookieAdapter } from "@/shared/lib/supabase-server-client";
import { createServerSessionSupabaseClient } from "@/shared/lib/supabase-server-client";

import { GET } from "./route";

vi.mock("@/shared/lib/supabase-server-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/supabase-server-client")>()),
  createServerSessionSupabaseClient: vi.fn(),
}));

const exchangeCodeMock = vi.fn();
const verifyOtpMock = vi.fn();
let capturedAdapter: SessionCookieAdapter | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  capturedAdapter = undefined;
  exchangeCodeMock.mockResolvedValue({ error: null });
  verifyOtpMock.mockResolvedValue({ error: null });
  vi.mocked(createServerSessionSupabaseClient).mockImplementation((adapter) => {
    capturedAdapter = adapter;

    return {
      auth: { exchangeCodeForSession: exchangeCodeMock, verifyOtp: verifyOtpMock },
    } as unknown as ReturnType<typeof createServerSessionSupabaseClient>;
  });
});

describe("recovery callback", () => {
  it("exchanges a PKCE code and redirects to the fixed reset page", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/recovery/callback?code=auth-code&next=https://evil.test",
      ),
    );

    expect(exchangeCodeMock).toHaveBeenCalledWith("auth-code");
    expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password");
  });

  it("verifies only recovery token hashes", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/recovery/callback?token_hash=token-hash&type=recovery",
      ),
    );

    expect(verifyOtpMock).toHaveBeenCalledWith({ token_hash: "token-hash", type: "recovery" });
    expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password");
  });

  it("rejects non-recovery token types without verifying them", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/recovery/callback?token_hash=token-hash&type=email",
      ),
    );

    expect(verifyOtpMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/forgot-password?error=invalid-link",
    );
  });

  it("redirects missing or rejected credentials to a generic fixed error", async () => {
    const missing = await GET(
      new NextRequest("http://localhost:3000/auth/recovery/callback?next=https://evil.test"),
    );

    expect(missing.headers.get("location")).toBe(
      "http://localhost:3000/forgot-password?error=invalid-link",
    );

    exchangeCodeMock.mockResolvedValue({ error: { message: "expired" } });
    const rejected = await GET(
      new NextRequest("http://localhost:3000/auth/recovery/callback?code=expired"),
    );

    expect(rejected.headers.get("location")).toBe(
      "http://localhost:3000/forgot-password?error=invalid-link",
    );
  });

  it("carries rotated session cookies onto the redirect with hardened flags", async () => {
    verifyOtpMock.mockImplementation(() => {
      capturedAdapter?.setAll([
        { name: "sb-session", options: { httpOnly: false, sameSite: "none" }, value: "recovery" },
      ]);

      return Promise.resolve({ error: null });
    });

    const response = (await GET(
      new NextRequest(
        "http://localhost:3000/auth/recovery/callback?token_hash=token-hash&type=recovery",
      ),
    )) as NextResponse;

    const cookie = response.cookies.get("sb-session");
    expect(cookie?.value).toBe("recovery");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password");
  });
});
