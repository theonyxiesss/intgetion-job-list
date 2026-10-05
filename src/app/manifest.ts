import type { MetadataRoute } from "next";
import { PRODUCT_NAME } from "@/config/product";

/** Install the site on a phone or desktop (P-MOBILE, D244). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT_NAME,
    short_name: "INTGETION",
    description: "Remote jobs that fit your skills, salary and time zone.",
    start_url: "/?utm_source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Jobs", url: "/jobs?utm_source=pwa" },
      { name: "Matches", url: "/matches?utm_source=pwa" },
      { name: "Applications", url: "/applications?utm_source=pwa" },
    ],
  };
}
