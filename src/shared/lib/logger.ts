export type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  requestId: string;
  userId: string | null;
}

export type LogMetadata = Readonly<Record<string, boolean | number | null>>;

export interface StructuredLogger {
  error(event: string, metadata?: LogMetadata): void;
  info(event: string, metadata?: LogMetadata): void;
  warn(event: string, metadata?: LogMetadata): void;
}

const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const SAFE_EVENT_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const SAFE_METADATA_KEY_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const MAX_EVENT_LENGTH = 128;
const MAX_METADATA_FIELDS = 32;
const MAX_METADATA_KEY_LENGTH = 64;

export function createRequestId(): string {
  return globalThis.crypto.randomUUID();
}

export function createLogger(context: LogContext): StructuredLogger {
  assertSafeIdentifier("requestId", context.requestId);

  if (context.userId !== null) {
    assertSafeIdentifier("userId", context.userId);
  }

  const safeContext: LogContext = {
    requestId: context.requestId,
    userId: context.userId,
  };

  return {
    error: (event, metadata) => writeLog("error", event, safeContext, metadata),
    info: (event, metadata) => writeLog("info", event, safeContext, metadata),
    warn: (event, metadata) => writeLog("warn", event, safeContext, metadata),
  };
}

function writeLog(
  level: LogLevel,
  event: string,
  context: LogContext,
  metadata?: LogMetadata,
): void {
  if (event.length > MAX_EVENT_LENGTH || !SAFE_EVENT_PATTERN.test(event)) {
    throw new Error("Log event must be a stable content-free identifier");
  }

  const safeMetadata = getSafeMetadata(metadata);

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: context.requestId,
    userId: context.userId,
    ...(safeMetadata === undefined ? {} : { metadata: safeMetadata }),
  };

  console[level](JSON.stringify(entry));
}

function assertSafeIdentifier(field: "requestId" | "userId", value: string): void {
  if (!SAFE_IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`${field} must be a safe opaque identifier`);
  }
}

function getSafeMetadata(metadata: LogMetadata | undefined): LogMetadata | undefined {
  if (metadata === undefined) {
    return undefined;
  }

  const entries = Object.entries(metadata);

  if (entries.length > MAX_METADATA_FIELDS) {
    throw new Error("Log metadata must contain at most 32 fields");
  }

  for (const [key, value] of entries) {
    if (key.length > MAX_METADATA_KEY_LENGTH || !SAFE_METADATA_KEY_PATTERN.test(key)) {
      throw new Error("Log metadata keys must be stable identifiers");
    }

    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("Log metadata numbers must be finite");
    }

    if (value !== null && typeof value !== "number" && typeof value !== "boolean") {
      throw new Error("Log metadata must be content-free");
    }
  }

  return Object.fromEntries(entries);
}
