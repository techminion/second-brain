import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";
import type { SessionCookieAdapter } from "@/shared/lib/supabase-server-client";
import { createServerSessionSupabaseClient } from "@/shared/lib/supabase-server-client";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/shared/lib/supabase-server-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/supabase-server-client")>()),
  createServerSessionSupabaseClient: vi.fn(),
}));

const getAllMock = vi.fn();
const setMock = vi.fn();
let capturedAdapter: SessionCookieAdapter | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  capturedAdapter = undefined;
  vi.mocked(cookies).mockResolvedValue({
    getAll: getAllMock,
    set: setMock,
  } as unknown as Awaited<ReturnType<typeof cookies>>);
  vi.mocked(createServerSessionSupabaseClient).mockImplementation((adapter) => {
    capturedAdapter = adapter;

    return {} as ReturnType<typeof createServerSessionSupabaseClient>;
  });
});

describe("createServerActionSupabaseClient", () => {
  it("reads session cookies from the request cookie store", async () => {
    getAllMock.mockReturnValue([{ name: "sb-session", value: "abc" }]);

    await createServerActionSupabaseClient();

    expect(capturedAdapter?.getAll()).toEqual([{ name: "sb-session", value: "abc" }]);
  });

  it("writes session cookies with the ADR-20 hardened flags", async () => {
    await createServerActionSupabaseClient();

    capturedAdapter?.setAll([
      { name: "sb-session", options: { httpOnly: false, sameSite: "none" }, value: "abc" },
    ]);

    expect(setMock).toHaveBeenCalledWith(
      "sb-session",
      "abc",
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
  });
});
