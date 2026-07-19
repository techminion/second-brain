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
  it("validates the session on every matched request", async () => {
    getClaimsMock.mockResolvedValue({ data: null, error: null });

    await middleware(new NextRequest("http://localhost:3000/signup"));

    expect(getClaimsMock).toHaveBeenCalledTimes(1);
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
  });
});
