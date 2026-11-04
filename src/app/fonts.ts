import { Manrope, IBM_Plex_Mono } from "next/font/google";

// D602: self-hosted by Next. Only Manrope Latin is preloaded (D434);
// Cyrillic and the numeric face load on demand, with visible fallback text.
export const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-ibm-plex-mono",
});

export const fontVariables = `${manrope.variable} ${ibmPlexMono.variable}`;
