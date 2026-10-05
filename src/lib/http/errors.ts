export const errorCodes = {
  validationError: "VALIDATION_ERROR",
  unauthenticated: "UNAUTHENTICATED",
  forbidden: "FORBIDDEN",
  notFound: "NOT_FOUND",
  alreadyApplied: "ALREADY_APPLIED",
  reapplyLimit: "REAPPLY_LIMIT",
  invalidTransition: "INVALID_TRANSITION",
  slugTaken: "SLUG_TAKEN",
  domainTaken: "DOMAIN_TAKEN",
  externalApply: "EXTERNAL_APPLY",
  profileIncomplete: "PROFILE_INCOMPLETE",
  jobNotPublished: "JOB_NOT_PUBLISHED",
  importedReadonly: "IMPORTED_READONLY",
  confirmationRequired: "CONFIRMATION_REQUIRED",
  rateLimited: "RATE_LIMITED",
  botBudgetExceeded: "BOT_BUDGET_EXCEEDED",
  stepUp: "STEP_UP",
  reasonRequired: "REASON_REQUIRED",
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

export type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly headers?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
  }
}

export function httpErrorResponse(error: HttpError): Response {
  const body: ErrorBody = {
    error: {
      code: error.code,
      message: error.message,
    },
  };
  if (error.details !== undefined) {
    body.error.details = error.details;
  }
  return Response.json(body, { status: error.status, headers: error.headers });
}

/** zod rejected the input. `details` lists the failing fields. */
export function validationError(details?: unknown): HttpError {
  return new HttpError(
    400,
    errorCodes.validationError,
    "Invalid input",
    details,
  );
}

/** No session, or a session whose email is not confirmed yet. */
export function unauthenticated(message = "Sign in first"): HttpError {
  return new HttpError(401, errorCodes.unauthenticated, message);
}

/** A rate limit is used up (section 6, P15). */
export function rateLimited(retryAfterSeconds: number): HttpError {
  return new HttpError(
    429,
    errorCodes.rateLimited,
    "Too many requests",
    { retryAfterSeconds },
    { "Retry-After": String(retryAfterSeconds) },
  );
}

/** Missing object, foreign object, or admin route for a non-admin. */
export function notFound(message = "Not found"): HttpError {
  return new HttpError(404, errorCodes.notFound, message);
}

/** The object is visible to the caller, but this action is not allowed. */
export function forbidden(message = "Forbidden"): HttpError {
  return new HttpError(403, errorCodes.forbidden, message);
}
