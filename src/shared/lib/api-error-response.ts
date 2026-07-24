import { NextResponse } from "next/server";

import { ServiceError } from "@/shared/lib/errors";

/**
 * Web API error envelope. Every route error response carries a stable `code`
 * (the 05_API §3 taxonomy code, or a boundary code like `UNAUTHENTICATED`) and
 * a human-readable `message` the client may surface.
 */
interface ApiErrorBody {
  error: { code: string; message: string };
}

/**
 * Translates a thrown `ServiceError` into its documented HTTP status
 * (05_API §3): `ValidationError` → 400, `NotFoundError` → 404, and so on. The
 * status and code live on the error itself, so the boundary never re-maps by
 * type. Anything that is not a `ServiceError` is unexpected — it is re-thrown so
 * `withRequestLogging` logs the failure and returns a generic 500 rather than
 * leaking internal detail to the client.
 */
export function serviceErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ServiceError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode },
    );
  }

  throw error;
}

/** 401 for a request with no verified session (not a `ServiceError` case). */
export function unauthenticatedResponse(): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code: "UNAUTHENTICATED", message: "Authentication required." } },
    { status: 401 },
  );
}
