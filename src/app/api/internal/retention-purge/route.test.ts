import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const runMock = vi.fn();

vi.mock("@/features/retention/retention-purge-service", () => ({
  createRetentionPurgeService: () => ({ run: runMock }),
}));

describe("retention purge route", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("PURGE_WEBHOOK_SECRET", "purge-secret");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    runMock.mockReset();
  });

  function createRequest(secret: string | null): Request {
    return new Request("https://example.test/api/internal/retention-purge", {
      headers: secret === null ? {} : { "x-webhook-secret": secret },
      method: "POST",
    });
  }

  it("rejects a missing or wrong shared secret without running the purge", async () => {
    const missing = await POST(createRequest(null));
    const wrong = await POST(createRequest("wrong-secret"));

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(runMock).not.toHaveBeenCalled();
  });

  it("runs the purge and returns the enveloped result for a valid secret", async () => {
    runMock.mockResolvedValue({
      foldersPurged: 1,
      knowledgeObjectsPurged: 2,
      storageObjectsRemoved: 1,
    });

    const response = await POST(createRequest("purge-secret"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { foldersPurged: 1, knowledgeObjectsPurged: 2, storageObjectsRemoved: 1 },
    });
  });

  it("returns 500 when the purge fails", async () => {
    runMock.mockRejectedValue(new Error("cloud unavailable"));

    const response = await POST(createRequest("purge-secret"));

    expect(response.status).toBe(500);
  });
});
