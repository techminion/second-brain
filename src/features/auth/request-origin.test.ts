import { headers } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRequestOrigin } from "./request-origin";

vi.mock("next/headers", () => ({ headers: vi.fn() }));

function stubHeaders(values: Record<string, string | null>): void {
  vi.mocked(headers).mockResolvedValue({
    get: (name: string) => values[name] ?? null,
  } as unknown as Awaited<ReturnType<typeof headers>>);
}

describe("getRequestOrigin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubHeaders({ host: "localhost:3000", origin: "http://localhost:3000" });
  });

  it("returns a matching HTTP or HTTPS origin", async () => {
    await expect(getRequestOrigin()).resolves.toBe("http://localhost:3000");
  });

  it("rejects a mismatched request origin and host", async () => {
    stubHeaders({ host: "second-brain.example", origin: "https://attacker.example" });

    await expect(getRequestOrigin()).rejects.toThrow("Invalid request origin");
  });

  it("honors a forwarded host and protocol only when the origin matches", async () => {
    stubHeaders({
      host: "internal.vercel",
      origin: "https://preview.example",
      "x-forwarded-host": "preview.example",
      "x-forwarded-proto": "https",
    });

    await expect(getRequestOrigin()).resolves.toBe("https://preview.example");
  });
});
