import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { themeCookieName } from "@/shared/lib/theme";

import { POST } from "./route";

vi.mock("@/features/auth/resolve-user-id", () => ({
  resolveSessionUserId: () => Promise.resolve("user-1"),
}));

function post(body: unknown) {
  return POST(
    new Request("https://x.test/api/theme", {
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
}

describe("POST /api/theme (SETUP-13, UX-09)", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["light", "dark", "system"])("stores %s in the theme cookie with 204", async (pref) => {
    const response = await post({ preference: pref });

    expect(response.status).toBe(204);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${themeCookieName}=${pref}`);
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  it.each([{ preference: "blue" }, {}, { preference: 1 }])("rejects %j with 400", async (body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a malformed body with 400", async () => {
    expect((await post("not json")).status).toBe(400);
  });
});
