export abstract class ServiceError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends ServiceError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;
}

export class NotFoundError extends ServiceError {
  readonly code = "NOT_FOUND";
  readonly statusCode = 404;
}

export class ForbiddenError extends ServiceError {
  readonly code = "FORBIDDEN";
  readonly statusCode = 403;
}

export class ConflictError extends ServiceError {
  readonly code = "CONFLICT";
  readonly statusCode = 409;
}

export class CyclicMoveError extends ServiceError {
  readonly code = "CYCLIC_MOVE";
  readonly statusCode = 400;
}

export class FileTooLargeError extends ServiceError {
  readonly code = "FILE_TOO_LARGE";
  readonly statusCode = 413;
}

export class RateLimitError extends ServiceError {
  readonly code = "RATE_LIMITED";
  readonly statusCode = 429;
}

export class UpstreamProviderError extends ServiceError {
  readonly code = "UPSTREAM_PROVIDER_ERROR";
  readonly statusCode = 502;
}
