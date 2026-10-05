import type { ReactNode } from "react";
import type { Viewport } from "next";

/** The keyboard shrinks the page, so the chat field stays above it (D287). */
export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
};

export default function ChatLayout({ children }: { children: ReactNode }) {
  return children;
}
