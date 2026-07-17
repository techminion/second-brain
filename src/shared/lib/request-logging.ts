import { NextResponse } from "next/server";

import { createLogger, createRequestId, type StructuredLogger } from "@/shared/lib/logger";

const routeNamePattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export interface RequestLogContext {
  logger: StructuredLogger;
  requestId: string;
}

type LoggedRouteHandler = (request: Request, context: RequestLogContext) => Promise<Response>;

export type ResolveUserId = (request: Request) => Promise<string | null>;

/**
 * Wraps a route handler with the 03_ARCHITECTURE §9 observability contract:
 * every request gets a request id and a structured completion/failure log
 * tagged with the (opaque) user id — never content. Route identity lives in
 * the event name because the OBS-01 logger rejects string metadata by design.
 *
 * `resolveUserId` is optional until AUTH-04 lands session middleware; a
 * resolver failure degrades to `userId: null` rather than failing the request.
 */
export function withRequestLogging(
  routeName: string,
  handler: LoggedRouteHandler,
  resolveUserId?: ResolveUserId,
): (request: Request) => Promise<Response> {
  if (!routeNamePattern.test(routeName)) {
    throw new Error("Route name must be a stable content-free identifier");
  }

  return async (request) => {
    const requestId = createRequestId();
    const userId = resolveUserId ? await resolveUserId(request).catch(() => null) : null;
    const logger = createLogger({ requestId, userId });
    const startedAt = performance.now();

    try {
      const response = await handler(request, { logger, requestId });

      logger.info(`request.${routeName}.completed`, {
        durationMs: Math.round(performance.now() - startedAt),
        status: response.status,
      });

      return response;
    } catch {
      logger.error(`request.${routeName}.failed`, {
        durationMs: Math.round(performance.now() - startedAt),
      });

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
