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
let capturedAdapter: SessionCookieAdapter | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  capturedAdapter = undefined;
  exchangeCodeMock.mockResolvedValue({ error: null });
  vi.mocked(createServerSessionSupabaseClient).mockImplementation((adapter) => {
    capturedAdapter = adapter;

    return { auth: { exchangeCodeForSession: exchangeCodeMock } } as unknown as ReturnType<
      typeof createServerSessionSupabaseClient
    >;
  });
});

describe("OAuth callback", () => {
  it("exchanges a PKCE code and redirects to the app", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/oauth/callback?code=auth-code&next=https://evil.test",
      ),
    );

    expect(exchangeCodeMock).toHaveBeenCalledWith("auth-code");
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects missing or rejected codes to a fixed generic error", async () => {
    const missing = await GET(
      new NextRequest("http://localhost:3000/auth/oauth/callback?next=https://evil.test"),
    );

    expect(exchangeCodeMock).not.toHaveBeenCalled();
    expect(missing.headers.get("location")).toBe("http://localhost:3000/login?error=oauth");

    exchangeCodeMock.mockResolvedValue({ error: { message: "expired" } });
    const rejected = await GET(
      new NextRequest("http://localhost:3000/auth/oauth/callback?code=expired"),
    );

    expect(rejected.headers.get("location")).toBe("http://localhost:3000/login?error=oauth");
  });

  it("carries session cookies onto the redirect with hardened flags", async () => {
    exchangeCodeMock.mockImplementation(() => {
      capturedAdapter?.setAll([
        { name: "sb-session", options: { httpOnly: false, sameSite: "none" }, value: "oauth" },
      ]);

      return Promise.resolve({ error: null });
    });

    const response = (await GET(
      new NextRequest("http://localhost:3000/auth/oauth/callback?code=auth-code"),
    )) as NextResponse;

    const cookie = response.cookies.get("sb-session");
    expect(cookie?.value).toBe("oauth");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
