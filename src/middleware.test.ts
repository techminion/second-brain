import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionCookieAdapter } from "@/shared/lib/supabase-server-client";
import { createServerSessionSupabaseClient } from "@/shared/lib/supabase-server-client";

import { middleware } from "./middleware";

vi.mock("@/shared/lib/supabase-server-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/supabase-server-client")>()),
  createServerSessionSupabaseClient: vi.fn(),
}));

const getClaimsMock = vi.fn();
let capturedAdapter: SessionCookieAdapter | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  capturedAdapter = undefined;
  vi.mocked(createServerSessionSupabaseClient).mockImplementation((adapter) => {
    capturedAdapter = adapter;

    return { auth: { getClaims: getClaimsMock } } as unknown as ReturnType<
      typeof createServerSessionSupabaseClient
    >;
  });
});

describe("middleware", () => {
  it.each(["/signup", "/forgot-password", "/auth/oauth/callback", "/auth/recovery/callback"])(
    "keeps the public auth page %s available without a session",
    async (path) => {
      getClaimsMock.mockResolvedValue({ data: null, error: null });

      const response = await middleware(new NextRequest(`http://localhost:3000${path}`));

      expect(getClaimsMock).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("keeps the reset completion page protected", async () => {
    getClaimsMock.mockResolvedValue({ data: null, error: null });

    const response = await middleware(new NextRequest("http://localhost:3000/reset-password"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("keeps API routes available for their own authentication policies", async () => {
    getClaimsMock.mockResolvedValue({ data: null, error: null });

    const response = await middleware(
      new NextRequest("http://localhost:3000/api/internal/retention-purge"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated app requests to login", async () => {
    getClaimsMock.mockResolvedValue({ data: null, error: null });

    const response = await middleware(new NextRequest("http://localhost:3000/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("allows authenticated app requests", async () => {
    getClaimsMock.mockResolvedValue({
      data: { claims: { sub: "d2b8a9c4-1111-4222-8333-444455556666" } },
      error: null,
    });

    const response = await middleware(new NextRequest("http://localhost:3000/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("fails closed when session validation throws", async () => {
    getClaimsMock.mockRejectedValue(new Error("Auth unavailable"));

    const response = await middleware(new NextRequest("http://localhost:3000/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("exposes the request's cookies to the Supabase client", async () => {
    getClaimsMock.mockResolvedValue({ data: null, error: null });
    const request = new NextRequest("http://localhost:3000/", {
      headers: { cookie: "sb-session=abc" },
    });

    await middleware(request);

    expect(capturedAdapter?.getAll()).toEqual([{ name: "sb-session", value: "abc" }]);
  });

  it("writes rotated session cookies onto the response with hardened flags", async () => {
    getClaimsMock.mockImplementation(() => {
      capturedAdapter?.setAll([
        {
          name: "sb-session",
          options: { httpOnly: false, maxAge: 3600, sameSite: "none" },
          value: "rotated",
        },
      ]);

      return Promise.resolve({ data: null, error: null });
    });

    const response = await middleware(new NextRequest("http://localhost:3000/"));
    const cookie = response.cookies.get("sb-session");

    expect(cookie?.value).toBe("rotated");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.maxAge).toBe(3600);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });
});
