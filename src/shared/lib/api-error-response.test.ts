import { describe, expect, it } from "vitest";

import { serviceErrorResponse, unauthenticatedResponse } from "./api-error-response";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

describe("serviceErrorResponse", () => {
  it("maps each service error to its documented status and code", async () => {
    const cases = [
      {
        error: new ValidationError("Title must not be empty"),
        status: 400,
        code: "VALIDATION_ERROR",
      },
      { error: new NotFoundError("Note not found"), status: 404, code: "NOT_FOUND" },
      { error: new ConflictError("Duplicate"), status: 409, code: "CONFLICT" },
    ];

    for (const { error, status, code } of cases) {
      const response = serviceErrorResponse(error);
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: { code, message: error.message } });
    }
  });

  it("re-throws a non-service error so the logging wrapper handles it", () => {
    const boom = new Error("unexpected");
    expect(() => serviceErrorResponse(boom)).toThrow(boom);
  });
});

describe("unauthenticatedResponse", () => {
  it("returns a 401 with the UNAUTHENTICATED code", async () => {
    const response = unauthenticatedResponse();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHENTICATED", message: "Authentication required." },
    });
  });
});
