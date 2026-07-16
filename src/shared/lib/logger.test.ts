import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createLogger,
  createRequestId,
  type LogLevel,
  type LogMetadata,
} from "@/shared/lib/logger";

const context = {
  requestId: "request-123",
  userId: "user-456",
};

describe("createRequestId", () => {
  it("creates an opaque UUID request identifier", () => {
    expect(createRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("createLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each<LogLevel>(["info", "warn", "error"])(
    "writes a structured %s JSON log with request and user context",
    (level) => {
      const consoleSpy = vi.spyOn(console, level).mockImplementation(() => undefined);
      const logger = createLogger(context);

      logger[level]("notes.list", { count: 3, durationMs: 12, successful: true });

      expect(consoleSpy).toHaveBeenCalledOnce();
      const [serializedEntry] = consoleSpy.mock.calls[0] ?? [];
      expect(typeof serializedEntry).toBe("string");

      expect(JSON.parse(String(serializedEntry))).toEqual({
        timestamp: expect.any(String),
        level,
        event: "notes.list",
        requestId: "request-123",
        userId: "user-456",
        metadata: {
          count: 3,
          durationMs: 12,
          successful: true,
        },
      });
    },
  );

  it("represents an unauthenticated request without inventing a user identifier", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    createLogger({ requestId: "request-123", userId: null }).info("auth.start");

    const [serializedEntry] = consoleSpy.mock.calls[0] ?? [];
    expect(JSON.parse(String(serializedEntry))).toMatchObject({ userId: null });
  });

  it("snapshots validated context instead of retaining a mutable caller object", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const mutableContext = { ...context };
    const logger = createLogger(mutableContext);
    mutableContext.userId = "changed-user";

    logger.info("notes.list");

    const [serializedEntry] = consoleSpy.mock.calls[0] ?? [];
    expect(JSON.parse(String(serializedEntry))).toMatchObject({ userId: "user-456" });
  });

  it("rejects free-text events", () => {
    const logger = createLogger(context);

    expect(() => logger.info("Viewed note: private title")).toThrow(
      "Log event must be a stable content-free identifier",
    );
    expect(() => logger.info(`event.${"a".repeat(128)}`)).toThrow(
      "Log event must be a stable content-free identifier",
    );
  });

  it("rejects content-bearing metadata at runtime", () => {
    const logger = createLogger(context);
    const unsafeMetadata = {
      noteBody: "private markdown",
    } as unknown as LogMetadata;

    expect(() => logger.info("notes.view", unsafeMetadata)).toThrow(
      "Log metadata must be content-free",
    );
  });

  it("serializes a plain copy instead of invoking metadata serialization hooks", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const metadata = Object.defineProperty({ count: 1 }, "toJSON", {
      enumerable: false,
      value: () => ({ noteBody: "private markdown" }),
    });

    createLogger(context).info("notes.list", metadata);

    const [serializedEntry] = consoleSpy.mock.calls[0] ?? [];
    expect(JSON.parse(String(serializedEntry))).toMatchObject({ metadata: { count: 1 } });
    expect(String(serializedEntry)).not.toContain("private markdown");
  });

  it("rejects unsafe request and user identifiers", () => {
    expect(() => createLogger({ requestId: "request\nforged", userId: null })).toThrow(
      "requestId must be a safe opaque identifier",
    );
    expect(() => createLogger({ requestId: "request-123", userId: "" })).toThrow(
      "userId must be a safe opaque identifier",
    );
  });

  it("rejects invalid metadata keys and non-finite measurements", () => {
    const logger = createLogger(context);

    expect(() => logger.info("notes.list", { "note-title": true })).toThrow(
      "Log metadata keys must be stable identifiers",
    );
    expect(() => logger.info("notes.list", { durationMs: Number.POSITIVE_INFINITY })).toThrow(
      "Log metadata numbers must be finite",
    );
    expect(() => logger.info("notes.list", { [`a${"b".repeat(64)}`]: true })).toThrow(
      "Log metadata keys must be stable identifiers",
    );
    expect(() =>
      logger.info(
        "notes.list",
        Object.fromEntries(Array.from({ length: 33 }, (_, index) => [`count${index}`, index])),
      ),
    ).toThrow("Log metadata must contain at most 32 fields");
  });
});
