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
