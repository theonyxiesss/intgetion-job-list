"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Fades a block in once when 15 % of it enters the viewport (DESIGN.md
 * 6.3). Server HTML is visible; hiding starts only after hydration and only
 * for blocks still below the fold, so nothing flashes and nothing is lost
 * without JS.
 */
export function Reveal({
  children,
  index = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Stagger position: delay = min(index, 5) × 60 ms. */
  index?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "pending" | "shown">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node || reducedMotion() || !("IntersectionObserver" in window)) {
      return;
    }
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) return; // already on screen
    const frame = requestAnimationFrame(() => setState("pending"));
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("shown");
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-reveal={state === "idle" ? undefined : state}
      data-i={Math.min(Math.max(index, 0), 5)}
      className={className}
    >
      {children}
    </Tag>
  );
}

/**
 * A telemetry number that counts up once when it scrolls into view
 * (DESIGN.md 6.3). The server renders the final value; the count only
 * plays for numbers that start off screen.
 */
export function CountUp({
  value,
  locale,
  durationMs = 700,
}: {
  value: number;
  locale: string;
  durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const format = (n: number) => new Intl.NumberFormat(locale).format(n);

  useEffect(() => {
    const node = ref.current;
    if (!node || reducedMotion() || !("IntersectionObserver" in window)) {
      return;
    }
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    let raf = 0;
    const start = requestAnimationFrame(() => setShown(0));
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const began = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - began) / durationMs);
        const eased = 1 - Math.pow(1 - t, 4);
        setShown(Math.round(value * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(start);
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className="tabular-nums">
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

/**
 * The header gets a bottom line and a surface once the page scrolls past
 * 24 px (DESIGN.md 6.6). It never hides or changes height.
 */
export function ScrollFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);
  return (
    <header
      data-scrolled={scrolled || undefined}
      className={`vt-site-header ${className ?? ""}`}
    >
      {children}
    </header>
  );
}
