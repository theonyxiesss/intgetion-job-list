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

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
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
  return Response.json(body, { status: error.status });
}

/** Missing object, foreign object, or admin route for a non-admin. */
export function notFound(message = "Not found"): HttpError {
  return new HttpError(404, errorCodes.notFound, message);
}

/** The object is visible to the caller, but this action is not allowed. */
export function forbidden(message = "Forbidden"): HttpError {
  return new HttpError(403, errorCodes.forbidden, message);
}
