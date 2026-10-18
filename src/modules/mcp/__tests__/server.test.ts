import { beforeEach, describe, expect, it, vi } from "vitest";

const searchJobs = vi.fn();
const getJobForPublic = vi.fn();
const getVisibleCompany = vi.fn();
const findEventsForPerson = vi.fn();
const searchServices = vi.fn();
const getPublishedServiceById = vi.fn();
const freelancePriceRange = vi.fn();
const enforceRateLimit = vi.fn();
const info = vi.fn();

vi.mock("@/modules/jobs/service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  searchJobs: (...args: unknown[]) => searchJobs(...args),
  getJobForPublic: (...args: unknown[]) => getJobForPublic(...args),
  getVisibleCompany: (...args: unknown[]) => getVisibleCompany(...args),
}));
vi.mock("@/modules/events/service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findEventsForPerson: (...args: unknown[]) => findEventsForPerson(...args),
}));
vi.mock(
  "@/modules/freelance/service/listing-service",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    searchServices: (...args: unknown[]) => searchServices(...args),
    getPublishedServiceById: (...args: unknown[]) =>
      getPublishedServiceById(...args),
    freelancePriceRange: (...args: unknown[]) => freelancePriceRange(...args),
  }),
);
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  enforceRateLimit: (...args: unknown[]) => enforceRateLimit(...args),
}));
vi.mock("@/lib/logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/logger")>();
  return {
    ...actual,
    logger: { ...actual.logger, info, warn: vi.fn(), error: vi.fn() },
  };
});

const { handleMcpRequest } = await import("../service");
const { rateLimited } = await import("@/lib/http");

const SITE = "http://localhost:3000";
const MODERN = "2026-07-28";
const LEGACY = "2025-11-25";

function job(
  id: string,
  source: { type: string; name: string | null; url: string | null },
) {
  return {
    id,
    title: `Job ${id.slice(-1)}`,
    description: "Write to hr@example.com or call +1 555 123 4567",
    category: "engineering",
    workFormat: "remote",
    employmentType: "full_time",
    location: null,
    salaryMin: null,
    salaryMax: null,
    publishedAt: "2026-10-01T00:00:00.000Z",
    applicationMethod: "external_url",
    applicationUrl: "https://apply.example/secret",
    source,
    company: {
      id: "c1",
      name: "Acme",
      slug: "acme",
      websiteUrl: null,
      description: null,
    },
    skills: [{ id: "s1", name: "TypeScript" }],
    languages: [],
    seniority: null,
    timezoneRequired: null,
    minOverlapHours: 3,
  };
}

const INTERNAL = "00000000-0000-4000-8000-000000000001";
const JOBICY = "00000000-0000-4000-8000-000000000002";
const REMOTIVE = "00000000-0000-4000-8000-000000000003";
const internalJob = job(INTERNAL, { type: "internal", name: null, url: null });
const jobicyJob = job(JOBICY, {
  type: "imported",
  name: "Jobicy",
  url: "https://jobicy.com/jobs/2",
});
const remotiveJob = job(REMOTIVE, {
  type: "imported",
  name: "Remotive",
  url: "https://remotive.com/jobs/3",
});

let nextId = 1;

function post(
  body: unknown,
  headers: Record<string, string> = {},
  method = "POST",
): Request {
  return new Request(`${SITE}/api/mcp`, {
    method,
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "x-forwarded-for": "203.0.113.7",
      ...headers,
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

function modern(
  method: string,
  params: Record<string, unknown> = {},
  name?: string,
): Request {
  return post(
    {
      jsonrpc: "2.0",
      id: nextId++,
      method,
      params: {
        ...params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": MODERN,
          "io.modelcontextprotocol/clientCapabilities": {},
          "io.modelcontextprotocol/clientInfo": {
            name: "test",
            version: "1",
          },
        },
      },
    },
    {
      "mcp-protocol-version": MODERN,
      "mcp-method": method,
      ...(name ? { "mcp-name": name } : {}),
    },
  );
}

function legacy(method: string, params: Record<string, unknown> = {}) {
  return post(
    { jsonrpc: "2.0", id: nextId++, method, params },
    { "mcp-protocol-version": LEGACY },
  );
}

async function rpc(request: Request) {
  const response = await handleMcpRequest(request);
  const text = await response.text();
  const json = text.startsWith("{")
    ? JSON.parse(text)
    : JSON.parse(
        text
          .split("\n")
          .find((line) => line.startsWith("data: "))!
          .slice(6),
      );
  return { status: response.status, json };
}

async function call(name: string, args: Record<string, unknown>) {
  const { json } = await rpc(
    modern("tools/call", { name, arguments: args }, name),
  );
  return json.result as {
    isError?: boolean;
    structuredContent?: Record<string, unknown>;
    content: { type: string; text: string }[];
  };
}

const MCP_TOOL_NAMES = [
  "search_jobs",
  "get_job",
  "find_events",
  "list_job_categories",
  "get_company",
  "find_services",
  "get_service",
  "freelance_price_range",
];

beforeEach(() => {
  vi.clearAllMocks();
  enforceRateLimit.mockResolvedValue(undefined);
  searchJobs.mockResolvedValue({
    items: [remotiveJob, internalJob, jobicyJob],
    nextCursor: null,
  });
  getJobForPublic.mockImplementation(
    async (id: string) =>
      [internalJob, jobicyJob, remotiveJob].find((j) => j.id === id) ?? null,
  );
  getVisibleCompany.mockResolvedValue(null);
  findEventsForPerson.mockResolvedValue([]);
  searchServices.mockResolvedValue({ services: [], total: 0, page: 1 });
  getPublishedServiceById.mockResolvedValue(null);
  freelancePriceRange.mockResolvedValue(null);
});

describe("MCP protocol (D486)", () => {
  it("lists the same eight read-only tools to a 2026-07-28 client", async () => {
    const { status, json } = await rpc(modern("tools/list"));
    expect(status).toBe(200);
    const tools = json.result.tools as {
      name: string;
      annotations: Record<string, unknown>;
    }[];
    expect(tools.map((t) => t.name)).toEqual(MCP_TOOL_NAMES);
    for (const t of tools) {
      expect(t.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
      });
    }
  });

  it("serves a 2025-11-25 client that opens with initialize", async () => {
    const init = await rpc(
      legacy("initialize", {
        protocolVersion: LEGACY,
        capabilities: {},
        clientInfo: { name: "legacy", version: "1" },
      }),
    );
    expect(init.status).toBe(200);
    expect(init.json.result.serverInfo.name).toBe("intgetion");
    const list = await rpc(legacy("tools/list"));
    expect(list.json.result.tools.map((t: { name: string }) => t.name)).toEqual(
      MCP_TOOL_NAMES,
    );
  });

  it("never lists a write or a signed-in tool", async () => {
    const { json } = await rpc(modern("tools/list"));
    const names = json.result.tools.map((t: { name: string }) => t.name);
    for (const write of [
      "apply_to_job",
      "save_job",
      "send_service_request",
      "get_my_profile",
      "propose_profile_update",
      "offer_step",
    ]) {
      expect(names).not.toContain(write);
    }
  });

  it("refuses to call a tool that is not on MCP", async () => {
    const { json } = await rpc(
      modern(
        "tools/call",
        { name: "apply_to_job", arguments: { jobId: INTERNAL } },
        "apply_to_job",
      ),
    );
    expect(json.result).toBeUndefined();
    expect(json.error).toBeDefined();
  });

  it("rejects arguments the tool does not take", async () => {
    const result = await call("search_jobs", { limit: 500 });
    expect(result?.isError ?? true).toBe(true);
    expect(searchJobs).not.toHaveBeenCalled();
  });

  it("does not advertise tools.listChanged: the list changes only with a deploy", async () => {
    const init = await rpc(
      legacy("initialize", {
        protocolVersion: LEGACY,
        capabilities: {},
        clientInfo: { name: "legacy", version: "1" },
      }),
    );
    expect(init.json.result.capabilities.tools?.listChanged).not.toBe(true);
  });

  it("closes a subscriptions/listen stream at once instead of holding it open", async () => {
    const response = await handleMcpRequest(
      modern("subscriptions/listen", {
        notifications: { toolsListChanged: true },
      }),
    );
    expect(response.status).toBe(200);
    const text = await Promise.race([
      response.text(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("stream stayed open")), 2000),
      ),
    ]);
    expect(text).toContain("notifications/subscriptions/acknowledged");
    expect(text).not.toContain('"toolsListChanged":true');
  });

  it("answers GET with 405: there are no sessions", async () => {
    const response = await handleMcpRequest(post(null, {}, "GET"));
    expect(response.status).toBe(405);
  });
});

describe("Host, Origin and rate limit", () => {
  it("rejects a foreign Host (DNS rebinding)", async () => {
    const response = await handleMcpRequest(
      modernWith({ host: "evil.example" }),
    );
    expect(response.status).toBe(403);
    expect(searchJobs).not.toHaveBeenCalled();
  });

  it("rejects a foreign browser Origin", async () => {
    const response = await handleMcpRequest(
      modernWith({ origin: "https://evil.example" }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects the opaque null Origin", async () => {
    const response = await handleMcpRequest(modernWith({ origin: "null" }));
    expect(response.status).toBe(403);
  });

  it("accepts a call without Origin and one from the site itself", async () => {
    expect((await handleMcpRequest(modernWith({}))).status).toBe(200);
    expect((await handleMcpRequest(modernWith({ origin: SITE }))).status).toBe(
      200,
    );
  });

  it("counts every request against the per-IP limit", async () => {
    await handleMcpRequest(modernWith({}));
    expect(enforceRateLimit).toHaveBeenCalledWith("mcpGuest", "203.0.113.7");
  });

  it("answers 429 with Retry-After once the limit is spent", async () => {
    enforceRateLimit.mockRejectedValueOnce(rateLimited(42));
    const response = await handleMcpRequest(modernWith({}));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(searchJobs).not.toHaveBeenCalled();
  });

  it("refuses a body over the size bound", async () => {
    const big = modern("tools/call", {
      name: "search_jobs",
      arguments: { q: "x".repeat(70 * 1024) },
    });
    const response = await handleMcpRequest(big);
    expect(response.status).toBe(413);
  });
});

function modernWith(headers: Record<string, string>): Request {
  const base = modern("tools/call", {
    name: "search_jobs",
    arguments: {},
  });
  const merged = new Headers(base.headers);
  merged.set("mcp-name", "search_jobs");
  for (const [key, value] of Object.entries(headers)) merged.set(key, value);
  return new Request(base.url, {
    method: "POST",
    headers: merged,
    body: base.body,
    duplex: "half",
  } as RequestInit);
}

describe("D484: closed sources stay closed", () => {
  it("search drops jobs whose source forbids third-party sites", async () => {
    const result = await call("search_jobs", {});
    const jobs = result.structuredContent!.jobs as { id: string }[];
    expect(jobs.map((j) => j.id)).toEqual([INTERNAL, JOBICY]);
    expect(result.content[0]!.text).not.toContain(REMOTIVE);
  });

  it("an allowed imported job names its source and links to it", async () => {
    const result = await call("search_jobs", {});
    const jobs = result.structuredContent!.jobs as {
      id: string;
      source: unknown;
    }[];
    expect(jobs.find((j) => j.id === JOBICY)!.source).toEqual({
      type: "imported",
      name: "Jobicy",
      url: "https://jobicy.com/jobs/2",
    });
    expect(jobs.find((j) => j.id === INTERNAL)!.source).toEqual({
      type: "internal",
    });
  });

  it("a closed source is not shown even by id", async () => {
    const result = await call("get_job", { id: REMOTIVE });
    expect(result.structuredContent).toEqual({
      available: false,
      reason: "source_terms",
      url: `${SITE}/jobs/${REMOTIVE}`,
    });
    expect(result.content[0]!.text).not.toContain("Job 3");
  });

  it("a company made by the importer is not shown", async () => {
    getVisibleCompany.mockResolvedValue({
      name: "Imported Inc",
      slug: "imported-inc",
      origin: "imported",
    });
    const result = await call("get_company", { slug: "imported-inc" });
    expect(result.structuredContent).toMatchObject({
      available: false,
      reason: "source_terms",
    });
    expect(result.content[0]!.text).not.toContain("Imported Inc");
  });
});

describe("no contacts and no private fields", () => {
  it("lists carry no description and no application link", async () => {
    const result = await call("search_jobs", {});
    const text = result.content[0]!.text;
    expect(text).not.toContain("hr@example.com");
    expect(text).not.toContain("apply.example");
    expect(text).not.toContain("description");
  });

  it("a company shows public fields only", async () => {
    getVisibleCompany.mockResolvedValue({
      name: "Acme",
      slug: "acme",
      origin: "registered",
      description: "We build.",
      legalName: "Acme Legal LLC",
      registrationNumber: "REG-123",
      createdBy: "user-9",
      domain: "acme.io",
    });
    const result = await call("get_company", { slug: "acme" });
    const text = result.content[0]!.text;
    expect(result.structuredContent).toMatchObject({ available: true });
    for (const secret of ["Acme Legal LLC", "REG-123", "user-9"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("a freelance service carries no seller id, links or contacts", async () => {
    getPublishedServiceById.mockResolvedValue({
      id: "00000000-0000-4000-8000-0000000000aa",
      slug: "landing-page",
      sellerId: "seller-secret-id",
      title: "Landing page, mail me at me@example.com",
      category: "development",
      languages: ["en"],
      description: "Telegram @sellerhandle for details",
      buyerNeeds: "",
      links: ["https://portfolio.example/private"],
      packages: [
        {
          tier: "basic",
          priceMinor: BigInt(15000),
          deliveryDays: 5,
          revisions: 1,
          includes: ["One page"],
        },
      ],
      completed: 2,
      rating: 4.5,
      reviews: 2,
    });
    const result = await call("get_service", {
      serviceId: "00000000-0000-4000-8000-0000000000aa",
    });
    const text = result.content[0]!.text;
    for (const secret of [
      "seller-secret-id",
      "me@example.com",
      "@sellerhandle",
      "portfolio.example",
    ]) {
      expect(text).not.toContain(secret);
    }
    expect(text).toContain("150");
    expect(text).toContain(`${SITE}/freelance/landing-page`);
  });

  it("events credit their open-data source", async () => {
    findEventsForPerson.mockResolvedValue([
      {
        slug: "devconf-2026",
        title: "DevConf",
        kind: "conference",
        format: "offline",
        startsAt: new Date("2026-11-01T00:00:00Z"),
        endsAt: new Date("2026-11-02T00:00:00Z"),
        city: "Berlin",
        country: "DE",
        topics: ["dev"],
        description: "long text",
        source: { name: "confs.tech", url: "https://confs.tech" },
      },
    ]);
    const result = await call("find_events", {});
    expect(result.structuredContent!.events).toEqual([
      expect.objectContaining({
        slug: "devconf-2026",
        source: { name: "confs.tech", url: "https://confs.tech" },
        url: `${SITE}/events/devconf-2026`,
      }),
    ]);
  });
});

describe("logs (D486)", () => {
  it("log the tool and outcome, never the arguments or the raw IP", async () => {
    await call("search_jobs", { q: "my private search phrase" });
    const lines = info.mock.calls.map((args) => JSON.stringify(args));
    const line = lines.find((l) => l.includes("mcp_tool_call"));
    expect(line).toBeDefined();
    expect(line).toContain("search_jobs");
    expect(line).not.toContain("my private search phrase");
    expect(line).not.toContain("203.0.113.7");
  });
});
