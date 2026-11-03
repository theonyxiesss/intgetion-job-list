import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FreelanceOrderStatus } from "@/config/freelance";
import { OrderSteps } from "./order-steps";

const labels = {
  sent: "Sent",
  accepted: "Accepted",
  in_progress: "Working",
  delivered: "Delivered",
  completed: "Done",
};
const render = (status: FreelanceOrderStatus) =>
  renderToStaticMarkup(
    createElement(OrderSteps, { status, labels, label: "Order steps" }),
  );

describe("order stage accessibility", () => {
  it.each(["cancelled", "declined", "expired"] as const)(
    "does not show %s as successful delivery",
    (status) => {
      expect(render(status)).toBe("");
    },
  );
  it.each([
    "sent",
    "accepted",
    "in_progress",
    "delivered",
    "completed",
  ] as const)("names exactly one current stage for %s", (status) => {
    const html = render(status);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    const current = html.match(/<li[^>]*aria-current="step"[^>]*>(.*?)<\/li>/)?.[1];
    expect(current).toContain(labels[status]);
    expect(html).toContain('aria-label="Order steps"');
  });
  it("returns to work after revision without claiming completion", () => {
    expect(render("delivered")).toMatch(
      /aria-current="step"[^>]*>(?:(?!<\/li>).)*Delivered/,
    );
    expect(render("in_progress")).toMatch(
      /aria-current="step"[^>]*>(?:(?!<\/li>).)*Working/,
    );
    expect(render("in_progress")).not.toMatch(
      /aria-current="step"[^>]*>(?:(?!<\/li>).)*Done/,
    );
  });
});
