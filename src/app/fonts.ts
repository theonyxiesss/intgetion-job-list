import { Geist, Geist_Mono } from "next/font/google";

// Geist for all text and Geist Mono for figures (D428). Cyrillic is loaded by
// unicode-range only when a page needs it; "swap" keeps text visible.
export const geist = Geist({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-geist",
});

export const geistMono = Geist_Mono({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const fontVariables = `${geist.variable} ${geistMono.variable}`;
