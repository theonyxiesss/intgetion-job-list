import { describe, expect, it } from "vitest";
import {
  errorCodes,
  forbidden,
  HttpError,
  httpErrorResponse,
  notFound,
} from "./errors";

describe("http errors", () => {
  it("uses 404 for an object the caller must not see", async () => {
    const response = httpErrorResponse(notFound());
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: errorCodes.notFound, message: "Not found" },
    });
  });

  it("uses 403 only when the object is visible and the action is denied", async () => {
    const response = httpErrorResponse(forbidden());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: errorCodes.forbidden, message: "Forbidden" },
    });
  });

  it("omits details unless they were provided", async () => {
    const withoutDetails = await httpErrorResponse(notFound()).json();
    expect(withoutDetails.error).not.toHaveProperty("details");

    const response = httpErrorResponse(
      new HttpError(422, errorCodes.profileIncomplete, "Incomplete", {
        completeness: 20,
        missing: ["profile.timezone"],
      }),
    );
    await expect(response.json()).resolves.toEqual({
      error: {
        code: errorCodes.profileIncomplete,
        message: "Incomplete",
        details: { completeness: 20, missing: ["profile.timezone"] },
      },
    });
  });
});
