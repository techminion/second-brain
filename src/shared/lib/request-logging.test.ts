import { afterEach, describe, expect, it, vi } from "vitest";

import { withRequestLogging } from "@/shared/lib/request-logging";

function lastLogEntry(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const [serialized] = spy.mock.calls.at(-1) ?? [];

  return JSON.parse(String(serialized)) as Record<string, unknown>;
}

function createRequest(): Request {
  return new Request("https://example.test/api/example", { method: "POST" });
}

describe("withRequestLogging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects route names that are not stable identifiers", () => {
    expect(() => withRequestLogging("Viewed note: title", async () => new Response())).toThrow(
      "Route name must be a stable content-free identifier",
    );
  });

  it("logs a completion event with status and numeric duration", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const handler = withRequestLogging(
      "api.example",
      async () => new Response(null, { status: 204 }),
    );

    const response = await handler(createRequest());

    expect(response.status).toBe(204);
    const entry = lastLogEntry(infoSpy);
    expect(entry).toMatchObject({
      event: "request.api.example.completed",
      userId: null,
    });
    expect(entry.requestId).toMatch(/^[0-9a-f-]{36}$/);
    const metadata = entry.metadata as Record<string, unknown>;
    expect(metadata.status).toBe(204);
    expect(typeof metadata.durationMs).toBe("number");
  });

  it("converts handler exceptions into a 500 and logs a failure event", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = withRequestLogging("api.example", async () => {
      throw new Error("boom");
    });

    const response = await handler(createRequest());

    expect(response.status).toBe(500);
    expect(lastLogEntry(errorSpy)).toMatchObject({ event: "request.api.example.failed" });
  });

  it("tags logs with the resolved user id and passes the logger to the handler", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const handler = withRequestLogging(
      "api.example",
      async (_request, { logger }) => {
        logger.info("api.example.domain-event");

        return new Response(null, { status: 200 });
      },
      async () => "d2b8a9c4-1111-4222-8333-444455556666",
    );

    await handler(createRequest());

    const events = infoSpy.mock.calls.map(
      (call) => JSON.parse(String(call[0])) as { event: string; userId: string },
    );
    expect(events.map((entry) => entry.event)).toEqual([
      "api.example.domain-event",
      "request.api.example.completed",
    ]);
    expect(new Set(events.map((entry) => entry.userId))).toEqual(
      new Set(["d2b8a9c4-1111-4222-8333-444455556666"]),
    );
  });

  it("degrades to a null user id when the resolver fails", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const handler = withRequestLogging(
      "api.example",
      async () => new Response(null, { status: 200 }),
      async () => {
        throw new Error("session lookup failed");
      },
    );

    const response = await handler(createRequest());

    expect(response.status).toBe(200);
    expect(lastLogEntry(infoSpy)).toMatchObject({ userId: null });
  });
});
