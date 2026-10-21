import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SPOKI_NAMESPACES,
  chatHref,
  chatTargetFromParams,
  pageSection,
  readDockPreference,
  targetKey,
} from "./spoki-dock-model";

const JOB = "0b5f3c9e-2d61-4c1f-9a3e-7c2b8d4e1f00";

describe("Spoki panel rules (D525)", () => {
  it("names the part of the site, never an id", () => {
    expect(pageSection("/jobs")).toBe("jobs");
    expect(pageSection(`/jobs/${JOB}`)).toBe("job");
    expect(pageSection("/jobs/rss.xml")).toBe("jobs");
    expect(pageSection("/campaigns/new")).toBe("ugc");
    expect(pageSection("/creator")).toBe("ugc");
    expect(pageSection("/freelance/orders/x")).toBe("freelance");
    expect(pageSection("/employer/jobs")).toBe("employer");
    expect(pageSection("/account")).toBe("account");
    expect(pageSection("/settings/notifications")).toBe("account");
    expect(pageSection("/pricing")).toBe("pricing");
    expect(pageSection("/")).toBe("other");
    expect(pageSection("/jobsearch")).toBe("other");
  });

  it("reads the thread of a /chat address and ignores the rest", () => {
    expect(chatTargetFromParams(new URLSearchParams(`job=${JOB}`))).toEqual({
      job: JOB,
    });
    expect(
      chatTargetFromParams(new URLSearchParams("from=services&x=1")),
    ).toEqual({ from: "services" });
    // A plain /chat keeps the open thread.
    expect(chatTargetFromParams(new URLSearchParams(""))).toBeNull();
    expect(chatTargetFromParams(new URLSearchParams("job=../x"))).toBeNull();
    expect(chatTargetFromParams(new URLSearchParams("from=evil"))).toBeNull();
  });

  it("keys a thread by its fields, in any order", () => {
    expect(targetKey(null)).toBe("general");
    expect(targetKey({ job: JOB })).toBe(`job=${JOB}`);
    expect(targetKey({ from: "campaigns", campaign: JOB })).toBe(
      targetKey({ campaign: JOB, from: "campaigns" }),
    );
  });

  it("builds the /chat address of a thread", () => {
    expect(chatHref(null)).toBe("/chat");
    expect(chatHref({ job: JOB })).toBe(`/chat?job=${JOB}`);
    expect(
      chatTargetFromParams(
        new URL(`http://x${chatHref({ from: "post_job" })}`).searchParams,
      ),
    ).toEqual({ from: "post_job" });
  });

  it("keeps only a known open or closed choice", () => {
    expect(readDockPreference("open")).toBe("open");
    expect(readDockPreference("closed")).toBe("closed");
    expect(readDockPreference(undefined)).toBeNull();
    expect(readDockPreference("1")).toBeNull();
  });

  it("the panel asks for exactly the namespaces the route allows", () => {
    const lazy = fs.readFileSync(
      path.join(__dirname, "spoki-chat-lazy.tsx"),
      "utf8",
    );
    const listed = [
      ...(lazy.match(/namespaces=\{\[([^\]]*)\]\}/)?.[1] ?? "").matchAll(
        /"([^"]+)"/g,
      ),
    ].map((match) => match[1]);
    expect(listed).toEqual([...SPOKI_NAMESPACES]);
  });
});
