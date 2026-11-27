import { describe, expect, it } from "vitest";
import { dockAllowed } from "./spoki-dock-on";

describe("dockAllowed", () => {
  it("shows the panel with SPOKI_DOCK in the classic interface", () => {
    expect(dockAllowed({ dockFlag: true, uiV2: false, inMiniApp: false })).toBe(
      true,
    );
  });

  it("never shows the panel with UI 2.0 (D611)", () => {
    expect(dockAllowed({ dockFlag: true, uiV2: true, inMiniApp: false })).toBe(
      false,
    );
  });

  it("never shows the panel inside the Telegram Mini App", () => {
    expect(dockAllowed({ dockFlag: true, uiV2: false, inMiniApp: true })).toBe(
      false,
    );
  });

  it("stays off without SPOKI_DOCK", () => {
    expect(
      dockAllowed({ dockFlag: false, uiV2: false, inMiniApp: false }),
    ).toBe(false);
  });
});
