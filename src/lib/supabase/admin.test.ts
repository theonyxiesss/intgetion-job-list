import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authAdminAvailable, deleteAuthUser, getAuthUserEmail } from "./admin";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example");
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("auth admin without the service-role key", () => {
  it("reports unavailable and never calls the network", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(authAdminAvailable()).toBe(false);
    expect(await deleteAuthUser("uid")).toBe("unavailable");
    expect(await getAuthUserEmail("uid")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("auth admin with the key", () => {
  beforeEach(() => vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "secret"));

  it("sends the key as apikey and bearer to the admin endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ email: " a@example.com " }), {
        status: 200,
      }),
    );
    expect(await getAuthUserEmail("u 1")).toBe("a@example.com");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://project.example/auth/v1/admin/users/u%201");
    expect(init.headers).toMatchObject({
      apikey: "secret",
      authorization: "Bearer secret",
    });
  });

  it("maps delete responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    expect(await deleteAuthUser("uid")).toBe("deleted");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await deleteAuthUser("uid")).toBe("missing");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    expect(await deleteAuthUser("uid")).toBe("failed");
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await deleteAuthUser("uid")).toBe("failed");
  });

  it("returns null for a missing user or a failed lookup", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await getAuthUserEmail("uid")).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await getAuthUserEmail("uid")).toBeNull();
  });
});
