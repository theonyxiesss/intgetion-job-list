import { z } from "zod";
import { HttpError, httpErrorResponse, validationError } from "./errors";

/** Parses a JSON body with a zod schema; bad JSON and bad shape are both 400. */
export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw validationError([{ path: [], message: "invalid_json" }]);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw validationError(
      parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}

/** Parses URL query parameters with a zod schema; bad shape is 400. */
export function readQuery<T extends z.ZodType>(
  request: Request,
  schema: T,
): z.infer<T> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    throw validationError(
      parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}

/** Turns a thrown HttpError into its response; anything else is a 500. */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof HttpError) return httpErrorResponse(error);
  console.error(error instanceof Error ? error.name : "unknown error");
  return Response.json(
    { error: { code: "INTERNAL", message: "Internal error" } },
    { status: 500 },
  );
}
