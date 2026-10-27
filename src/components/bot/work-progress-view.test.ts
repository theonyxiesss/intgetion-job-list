import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import { WorkProgressCard } from "./work-progress-card";
import { Choice } from "./blocks/simple";

// These scenarios exercise reply buttons; Next's client router is not involved.
vi.mock("@/i18n/navigation", () => ({ Link: "a" }));

const render = (child: ReturnType<typeof createElement>) => {
  const props = { locale: "en", messages, timeZone: "UTC", children: child };
  return renderToStaticMarkup(createElement(NextIntlClientProvider, props));
};

describe("work and clarification accessibility", () => {
  it("shows a failed empty turn without claiming it is still preparing", () => {
    const html = render(
      createElement(WorkProgressCard, { steps: [], state: "failed" }),
    );
    expect(html).toContain("Could not finish");
    expect(html).toContain("No tool steps were recorded");
    expect(html).not.toContain("Preparing a response");
  });

  it("shows confirmation as pending, not completed", () => {
    const html = render(
      createElement(WorkProgressCard, {
        steps: [{ id: "one", name: "apply_to_job", status: "waiting" }],
        state: "done",
      }),
    );
    expect(html).toContain("Needs attention");
    expect(html).toContain("Waiting for your confirmation");
    expect(html).not.toContain("Step completed");
  });

  it("marks only the selected answer and offers the composer", () => {
    const html = render(
      createElement(Choice, {
        props: { question: "Which format?", options: ["video", "photo"] },
        actions: [
          { id: "video", type: "reply", label: "Video", text: "Video" },
          { id: "photo", type: "reply", label: "Photo", text: "Photo" },
        ],
        handlers: {
          done: ["video"],
          sending: false,
          stale: false,
          busy: null,
          reply() {},
          act() {},
          edit() {},
        },
      }),
    );
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain("Answer in my own words");
  });
});

describe("the work timeline (TZ 36, task A)", () => {
  it("shows what each step did, its time and the turn total", () => {
    const html = render(
      createElement(WorkProgressCard, {
        steps: [
          {
            id: "a",
            name: "search_jobs",
            status: "completed",
            ms: 1200,
            summary: {
              kind: "jobs",
              count: 5,
              category: "design",
              remote: true,
              dropped: true,
            },
          },
          {
            id: "b",
            name: "show_ui",
            status: "completed",
            ms: 300,
            summary: { kind: "compare", count: 2 },
          },
        ],
        state: "done",
      }),
    );
    expect(html).toContain("2 steps");
    expect(html).toContain("2 s");
    expect(html).toContain("Design · remote → 5 jobs");
    expect(html).toContain("The query word found nothing, searched without it");
    expect(html).toContain("2 jobs side by side");
    expect(html).toContain("1.2 s");
  });

  it("says when a backup model answered", () => {
    const html = render(
      createElement(WorkProgressCard, {
        steps: [],
        state: "done",
        fallback: true,
      }),
    );
    expect(html).toContain("a backup model replied");
  });

  it("says nothing was found in words", () => {
    const html = render(
      createElement(WorkProgressCard, {
        steps: [
          {
            id: "a",
            name: "search_jobs",
            status: "completed",
            summary: { kind: "jobs", count: 0 },
          },
        ],
        state: "done",
      }),
    );
    expect(html).toContain("nothing found");
  });
});
