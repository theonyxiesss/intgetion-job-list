import { Geist, Geist_Mono } from "next/font/google";

// Geist for all text and Geist Mono for figures (D428). Only Geist Latin is
// preloaded: every preloaded file counts against the home LCP budget (D144,
// D434). Cyrillic and Mono still load by unicode-range when a page uses them;
// "swap" keeps text visible meanwhile.
export const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-geist-mono",
});

export const fontVariables = `${geist.variable} ${geistMono.variable}`;
