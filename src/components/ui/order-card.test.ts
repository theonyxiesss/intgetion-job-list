import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: Record<string, unknown>) => createElement("a", props),
}));

const { OrderCard } = await import("./order-card");
const { OrderSteps } = await import("./order-steps");

const labels = {
  accepted: "Accepted",
  work: "In work",
  review: "On review",
  done: "Done",
};

function steps(stage: Parameters<typeof OrderSteps>[0]["stage"]): string {
  return renderToStaticMarkup(
    createElement(OrderSteps, { stage, labels, label: "Order steps" }),
  );
}

describe("OrderSteps (D603)", () => {
  it("marks the current step and leaves the later ones ahead", () => {
    const html = steps({ step: 1, tone: "work" });
    expect(html).toContain('aria-label="Order steps"');
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="step"[^>]*border-signal[^>]*>In work/);
    expect(html).toMatch(/border-fg-muted[^>]*>Accepted/);
    expect(html).toMatch(/border-line text-fg-subtle[^>]*>On review/);
  });

  it("draws the review step in the warning colour", () => {
    expect(steps({ step: 2, tone: "review" })).toMatch(
      /aria-current="step"[^>]*border-warning[^>]*>On review/,
    );
  });

  it("draws every step green when the order is done", () => {
    const html = steps({ step: 3, tone: "done" });
    expect(html.match(/border-success/g)).toHaveLength(4);
    expect(html).toMatch(/aria-current="step"[^>]*>Done/);
  });

  it("has no current step before acceptance or after a refusal", () => {
    expect(steps({ step: null, tone: "waiting" })).not.toContain(
      "aria-current",
    );
    expect(steps({ step: null, tone: "closed" })).not.toContain("aria-current");
  });
});

describe("OrderCard (D603)", () => {
  const base = {
    href: "/freelance/orders/abc",
    icon: "freelance" as const,
    code: "FR / ABCD",
    status: "In work",
    stage: { step: 1 as const, tone: "work" as const },
    stepLabels: labels,
    stepsLabel: "Order steps",
    title: "Landing page",
    price: { label: "Order price", value: "$850" },
  };

  it("shows number, status dot, price and the title link", () => {
    const html = renderToStaticMarkup(createElement(OrderCard, base));
    expect(html).toContain("FR / ABCD");
    expect(html).toMatch(/text-fg[^>]*><span aria-hidden="true"[^>]*bg-signal/);
    expect(html).toContain('href="/freelance/orders/abc"');
    expect(html).toContain("$850");
    expect(html).not.toContain("<details");
  });

  it("puts the next step behind a native toggle with a way into the order", () => {
    const html = renderToStaticMarkup(
      createElement(OrderCard, {
        ...base,
        next: {
          label: "Next step",
          text: "The seller is working.",
          open: "Open order",
          yours: true,
        },
      }),
    );
    expect(html).toContain("<details");
    expect(html).toMatch(/<summary[^>]*>.*bg-signal.*Next step/);
    expect(html).toContain("The seller is working.");
    expect(html.match(/href="\/freelance\/orders\/abc"/g)).toHaveLength(2);
  });

  it("shows the other side's initials and the actions in the footer", () => {
    const html = renderToStaticMarkup(
      createElement(OrderCard, {
        ...base,
        person: { name: "Maria S", initials: "MS" },
        actions: createElement("button", { type: "button" }, "Remind"),
      }),
    );
    expect(html).toContain(">MS<");
    expect(html).toContain("Maria S");
    expect(html).toContain(">Remind<");
  });
});
