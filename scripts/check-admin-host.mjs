#!/usr/bin/env node
/**
 * Checks that an admin host is ready to turn on ADMIN_HOST_ONLY (D251).
 * Usage: node scripts/check-admin-host.mjs <admin-origin> [--public <origin>]
 * Example: pnpm admin:check-host https://admin.intgetion.com
 *
 * Does not change DNS, Vercel, or the flag.
 */

import { pathToFileURL } from "node:url";

/**
 * @param {string} adminOrigin
 * @param {string} [publicOrigin]
 */
export function publicOriginFor(adminOrigin, publicOrigin) {
  if (publicOrigin) return publicOrigin.replace(/\/+$/, "");
  const url = new URL(adminOrigin);
  const host = url.hostname.replace(/^admin\./, "");
  const port = url.port ? `:${url.port}` : "";
  return `${url.protocol}//${host}${port}`;
}

/**
 * @param {string} adminOrigin
 * @param {string} publicOrigin
 * @param {(url: string, init?: RequestInit) => Promise<Response>} fetchImpl
 */
export async function checkAdminHost(adminOrigin, publicOrigin, fetchImpl) {
  const admin = adminOrigin.replace(/\/+$/, "");
  const site = publicOrigin.replace(/\/+$/, "");
  /** @type {{ name: string, url: string, ok: (response: Response) => Promise<boolean> | boolean }[]} */
  const checks = [
    {
      name: "login",
      url: `${admin}/en/admin/login`,
      ok: (response) => response.status === 200,
    },
    {
      name: "mfa",
      url: `${admin}/en/admin/mfa`,
      ok: (response) => response.status === 200,
    },
    {
      name: "home is 404",
      url: `${admin}/en`,
      ok: (response) => response.status === 404,
    },
    {
      name: "jobs is 404",
      url: `${admin}/en/jobs`,
      ok: (response) => response.status === 404,
    },
    {
      name: "robots",
      url: `${admin}/robots.txt`,
      ok: async (response) =>
        response.status === 200 &&
        (await response.text()).includes("Disallow: /"),
    },
    {
      name: "public /en/admin is 404",
      url: `${site}/en/admin`,
      ok: (response) => response.status === 404,
    },
    {
      name: "public /en/admin/login is 404",
      url: `${site}/en/admin/login`,
      ok: (response) => response.status === 404,
    },
  ];

  /** @type {{ name: string, url: string, pass: boolean, detail: string }[]} */
  const lines = [];
  for (const check of checks) {
    try {
      const response = await fetchImpl(check.url, { redirect: "manual" });
      const pass = await check.ok(response);
      lines.push({
        name: check.name,
        url: check.url,
        pass,
        detail: pass ? "ok" : `status ${response.status}`,
      });
    } catch (error) {
      lines.push({
        name: check.name,
        url: check.url,
        pass: false,
        detail: error instanceof Error ? error.name : "Error",
      });
    }
  }
  return { ok: lines.every((line) => line.pass), lines };
}

function printUsage() {
  console.error(
    "Usage: pnpm admin:check-host <admin-origin> [--public <origin>]",
  );
}

async function main() {
  const args = process.argv.slice(2);
  const adminOrigin = args.find((arg) => !arg.startsWith("--"));
  const publicFlag = args.indexOf("--public");
  const publicOrigin = publicFlag >= 0 ? args[publicFlag + 1] : undefined;
  if (!adminOrigin) {
    printUsage();
    process.exit(2);
  }
  let site;
  try {
    site = publicOriginFor(adminOrigin, publicOrigin);
  } catch {
    console.error("The admin origin must be an absolute URL.");
    process.exit(2);
  }
  const result = await checkAdminHost(adminOrigin, site, fetch);
  for (const line of result.lines) {
    console.log(
      `${line.pass ? "ok" : "FAIL"}  ${line.name}  ${line.url}  ${line.detail}`,
    );
  }
  if (!result.ok) process.exit(1);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
