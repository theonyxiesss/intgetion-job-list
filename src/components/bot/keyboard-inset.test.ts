import { describe, expect, it } from "vitest";
import {
  keyboardOverlaps,
  nextKeyboardPhase,
  type KeyboardPhase,
} from "./keyboard-inset";

const closed: KeyboardPhase = { open: false, sawKeyboard: false };

describe("keyboardOverlaps", () => {
  it("is open when the visible page is shorter by a keyboard", () => {
    expect(keyboardOverlaps(800, 420, 0)).toBe(true);
  });

  it("stays closed for browser chrome and a full page", () => {
    expect(keyboardOverlaps(800, 760, 0)).toBe(false);
    expect(keyboardOverlaps(800, 800, 0)).toBe(false);
  });

  it("counts the visual viewport offset", () => {
    expect(keyboardOverlaps(800, 500, 40)).toBe(true);
  });
});

describe("nextKeyboardPhase", () => {
  it("hides the bar as soon as the field is focused on a phone", () => {
    expect(
      nextKeyboardPhase(closed, {
        narrow: true,
        covered: false,
        writing: true,
      }),
    ).toEqual({ open: true, sawKeyboard: false });
  });

  it("keeps the bar hidden while the keyboard covers the page", () => {
    const writing = nextKeyboardPhase(closed, {
      narrow: true,
      covered: false,
      writing: true,
    });
    expect(
      nextKeyboardPhase(writing, {
        narrow: true,
        covered: true,
        writing: true,
      }),
    ).toEqual({ open: true, sawKeyboard: true });
  });

  it("brings the bar back when the keyboard closes, even if the field stays focused", () => {
    const typing: KeyboardPhase = { open: true, sawKeyboard: true };
    expect(
      nextKeyboardPhase(typing, {
        narrow: true,
        covered: false,
        writing: true,
      }),
    ).toEqual({ open: false, sawKeyboard: true });
  });

  it("forgets the keyboard after the person leaves the field", () => {
    const typing: KeyboardPhase = { open: false, sawKeyboard: true };
    expect(
      nextKeyboardPhase(typing, {
        narrow: true,
        covered: false,
        writing: false,
      }),
    ).toEqual(closed);
  });

  it("leaves the bar alone on a wide screen", () => {
    expect(
      nextKeyboardPhase(closed, {
        narrow: false,
        covered: true,
        writing: true,
      }),
    ).toEqual({ open: false, sawKeyboard: true });
  });
});
