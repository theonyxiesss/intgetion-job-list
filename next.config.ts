import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { apiCsp, staticSecurityHeaders } from "./src/lib/security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "admin.localhost"],
  poweredByHeader: false,
  // Module packages ship TypeScript sources (theonyxiesss/intgetion-*).
  transpilePackages: ["@intgetion/contacts", "@intgetion/kit"],
  async headers() {
    return [
      { source: "/:path*", headers: staticSecurityHeaders },
      {
        source: "/api/:path*",
        headers: [{ key: "Content-Security-Policy", value: apiCsp }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
