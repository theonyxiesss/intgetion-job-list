/** A software keyboard, not the browser chrome. Chrome is usually under this. */
const KEYBOARD_OVERLAP_PX = 80;

export type KeyboardPhase = {
  /** The tab bar is hidden and the field sits on the bottom edge. */
  open: boolean;
  /** The keyboard was seen this visit, so closing it brings the bar back. */
  sawKeyboard: boolean;
};

/**
 * True when the visible viewport is shorter than the layout viewport by
 * about a keyboard. Safari pans the visible page up to the field, so the
 * pan (`offsetTop`) is not subtracted: it would hide the keyboard and bring
 * the tab bar back onto it (D468). Pinch zoom also shrinks the visible
 * page, so its height is counted at the zoom scale.
 */
export function keyboardOverlaps(
  layoutHeight: number,
  visualHeight: number,
  scale = 1,
): boolean {
  return layoutHeight - visualHeight * scale > KEYBOARD_OVERLAP_PX;
}

/**
 * Hide the phone tab bar as soon as the person writes. Once the keyboard
 * has actually opened, trust it: closing the keyboard shows the bar again
 * even if the field stays focused.
 */
export function nextKeyboardPhase(
  phase: KeyboardPhase,
  input: { narrow: boolean; covered: boolean; writing: boolean },
): KeyboardPhase {
  let sawKeyboard = phase.sawKeyboard;
  if (input.covered) sawKeyboard = true;
  if (!input.writing && !input.covered) sawKeyboard = false;
  const open =
    input.narrow && (input.covered || (input.writing && !sawKeyboard));
  return { open, sawKeyboard };
}
