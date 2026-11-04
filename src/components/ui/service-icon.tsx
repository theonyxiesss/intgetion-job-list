import { cn } from "./cn";

/**
 * Service marks (D601): one duotone glyph per part of the platform, and the
 * Spoki star. The six service glyphs are Phosphor Icons duotone, unmodified
 * paths (github.com/phosphor-icons/core, commit 2b75f3ad), under the MIT
 * licence below. The Spoki star is original geometry for INTGETION JOB LIST.
 * Inline SVG, so no request and no client JS; colour follows `currentColor`.
 *
 * MIT License
 *
 * Copyright (c) 2023 Phosphor Icons
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export type ServiceIconName =
  "jobs" | "freelance" | "ugc" | "events" | "wallet" | "order" | "spoki";

/** [soft fill, line] paths on a 256 grid. */
const GLYPHS: Record<Exclude<ServiceIconName, "spoki">, [string, string]> = {
  jobs: [
    "M224,118.31V200a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V118.31h0A191.14,191.14,0,0,0,128,144,191.08,191.08,0,0,0,224,118.31Z",
    "M104,112a8,8,0,0,1,8-8h32a8,8,0,0,1,0,16H112A8,8,0,0,1,104,112ZM232,72V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V72A16,16,0,0,1,40,56H80V48a24,24,0,0,1,24-24h48a24,24,0,0,1,24,24v8h40A16,16,0,0,1,232,72ZM96,56h64V48a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8ZM40,72v41.62A184.07,184.07,0,0,0,128,136a184,184,0,0,0,88-22.39V72ZM216,200V131.63A200.25,200.25,0,0,1,128,152a200.19,200.19,0,0,1-88-20.36V200H216Z",
  ],
  freelance: [
    "M224,80l-96,56L32,80l96-56Z",
    "M230.91,172A8,8,0,0,1,228,182.91l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,36,169.09l92,53.65,92-53.65A8,8,0,0,1,230.91,172ZM220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09ZM24,80a8,8,0,0,1,4-6.91l96-56a8,8,0,0,1,8.06,0l96,56a8,8,0,0,1,0,13.82l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,24,80Zm23.88,0L128,126.74,208.12,80,128,33.26Z",
  ],
  ugc: [
    "M200,72V184a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V72a8,8,0,0,1,8-8H192A8,8,0,0,1,200,72Z",
    "M251.77,73a8,8,0,0,0-8.21.39L208,97.05V72a16,16,0,0,0-16-16H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V159l35.56,23.71A8,8,0,0,0,248,184a8,8,0,0,0,8-8V80A8,8,0,0,0,251.77,73ZM192,184H32V72H192V184Zm48-22.95-32-21.33V116.28L240,95Z",
  ],
  events: [
    "M216,48V88H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z",
    "M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-68-76a12,12,0,1,1-12-12A12,12,0,0,1,140,132Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,132ZM96,172a12,12,0,1,1-12-12A12,12,0,0,1,96,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,140,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,172Z",
  ],
  wallet: [
    "M224,80V192a8,8,0,0,1-8,8H56a16,16,0,0,1-16-16V56A16,16,0,0,0,56,72H216A8,8,0,0,1,224,80Z",
    "M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z",
  ],
  order: [
    "M224,56V208l-32-16-32,16-32-16L96,208,64,192,32,208V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z",
    "M72,104a8,8,0,0,1,8-8h96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,104Zm8,40h96a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16ZM232,56V208a8,8,0,0,1-11.58,7.15L192,200.94l-28.42,14.21a8,8,0,0,1-7.16,0L128,200.94,99.58,215.15a8,8,0,0,1-7.16,0L64,200.94,35.58,215.15A8,8,0,0,1,24,208V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Zm-16,0H40V195.06l20.42-10.22a8,8,0,0,1,7.16,0L96,199.06l28.42-14.22a8,8,0,0,1,7.16,0L160,199.06l28.42-14.22a8,8,0,0,1,7.16,0L216,195.06Z",
  ],
};

/** The Spoki star, "north" variant of the concept, on a 100 grid. */
const SPOKI =
  "M50 3C54 31 59 35 76 20C64 39 67 44 97 50C67 54 64 60 80 77C60 65 55 69 50 97C45 69 39 65 21 80C35 59 31 55 3 50C32 45 36 39 20 22C40 35 45 31 50 3ZM50 39 39 50 50 61 61 50Z";

export function ServiceIcon({
  name,
  size = 24,
  className,
}: {
  name: ServiceIconName;
  size?: number;
  className?: string;
}) {
  if (name === "spoki") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="currentColor"
        className={cn("shrink-0", className)}
      >
        <path fillRule="evenodd" d={SPOKI} />
      </svg>
    );
  }
  const [soft, line] = GLYPHS[name];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="currentColor"
      className={cn("shrink-0", className)}
    >
      <path d={soft} opacity="0.2" />
      <path d={line} />
    </svg>
  );
}

/** A mark in its square box, as on the service tiles. */
export function ServiceIconBox({
  name,
  className,
}: {
  name: ServiceIconName;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg",
        className,
      )}
    >
      <ServiceIcon name={name} size={24} />
    </span>
  );
}
