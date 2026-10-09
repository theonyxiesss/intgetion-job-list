"use client";

import { useState } from "react";
import {
  companyLogoSrc,
  companyMarkIndex,
  publicHttpUrl,
} from "@/lib/company-mark";
import { cn } from "./cn";
import { Morph } from "./page-transition";

const boxClass = {
  // Card width, not the viewport: 32px under 640px, 40px from there.
  // The glyph stays 24px, so the narrow frame holds a larger drawing.
  card: "size-8 @min-[640px]:size-10",
  page: "size-12",
  profile: "size-16",
} as const;

const glyphClass = {
  card: "size-6",
  page: "size-7",
  profile: "size-9",
} as const;

type MarkSize = keyof typeof boxClass;

function MarkGlyph({ index, className }: { index: number; className: string }) {
  const common = {
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
  };
  if (index === 1) {
    return (
      <svg {...common}>
        <circle cx="16" cy="16" r="10" />
        <circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (index === 2) {
    return (
      <svg {...common}>
        <path d="M6 19c2.2-9 17.8-9 20 0" />
        <path d="M6 13c2.2 9 17.8 9 20 0" />
      </svg>
    );
  }
  if (index === 3) {
    return (
      <svg {...common}>
        <rect x="8" y="8" width="16" height="16" transform="rotate(45 16 16)" />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <ellipse cx="16" cy="16" rx="12" ry="5.5" transform="rotate(-28 16 16)" />
      <path
        d="M16 11.2l.9 2.6h2.7l-2.2 1.6.8 2.6-2.2-1.6-2.2 1.6.8-2.6-2.2-1.6h2.7z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/**
 * Company avatar. An uploaded logo when there is one; otherwise one of four
 * orbit marks, the same mark every time for that company (D372).
 */
export function CompanyMark({
  companyId,
  src,
  size = "card",
  transitionName,
  className,
}: {
  companyId: string;
  src?: string | null;
  size?: MarkSize;
  /** Same name on the card and the job page so the mark morphs. */
  transitionName?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;
  const frame = (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-line bg-bg text-fg",
        boxClass[size],
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- private bucket, served by our route
        <img
          src={src ?? ""}
          alt=""
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <MarkGlyph
          index={companyMarkIndex(companyId)}
          className={glyphClass[size]}
        />
      )}
    </span>
  );
  if (!transitionName) return frame;
  return <Morph name={transitionName}>{frame}</Morph>;
}

export function CompanyMarkFor({
  company,
  size = "card",
  className,
}: {
  company: { id: string; slug: string; logoPath: string | null };
  size?: MarkSize;
  className?: string;
}) {
  return (
    <CompanyMark
      companyId={company.id}
      src={companyLogoSrc(company.slug, company.logoPath)}
      transitionName={`company-mark-${company.id}`}
      size={size}
      className={className}
    />
  );
}

export function CompanyLinks({
  links,
}: {
  links: { href: string | null; label: string }[];
}) {
  const items = links.flatMap((link) => {
    const href = publicHttpUrl(link.href);
    return href ? [{ href, label: link.label }] : [];
  });
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item.label}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="t-body-s underline-offset-4 hover:underline"
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
