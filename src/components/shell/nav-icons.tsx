import type { ReactNode } from "react";

/**
 * Original marks for the phone menu (D393). Thin geometry, currentColor,
 * stroke 1.5, square corners. Not Lucide, and not the product orbit.
 * Keys are the hrefs Header puts into MobileNav.
 */
export type NavMarkProps = {
  size?: 16 | 20 | 24;
  className?: string;
};

export type NavMark = (props: NavMarkProps) => ReactNode;

function Frame({
  size = 24,
  className,
  children,
}: NavMarkProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

function JobsMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="3" y="8.5" width="18" height="12" />
      <path d="M9 8.5 V4.5 H15 V8.5" />
      <path d="M4.5 13 H19.5" />
    </Frame>
  );
}

function EventsMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="3.5" y="5.5" width="17" height="15" />
      <path d="M3.5 10 H20.5 M8 3 V7.5 M16 3 V7.5 M7.5 14.5 H10.5" />
    </Frame>
  );
}

function MatchesMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="3.5" y="3.5" width="10.5" height="10.5" />
      <rect x="10" y="10" width="10.5" height="10.5" />
    </Frame>
  );
}

function PricingMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M3.5 6 H13 L20 12 L13 18 H3.5 Z" />
      <circle cx="8" cy="12" r="1.75" />
    </Frame>
  );
}

function EmployerJobsMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M3.5 4.5 H16.5 V7.5" />
      <path d="M3.5 4.5 V16.5 H7.5" />
      <rect x="7.5" y="7.5" width="13" height="13" />
      <path d="M10.5 12 H17.5 M10.5 15.5 H15" />
    </Frame>
  );
}

function CompanyMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="3.5" y="12" width="4.5" height="8.5" />
      <rect x="9.75" y="3.5" width="4.5" height="17" />
      <rect x="16" y="8" width="4.5" height="12.5" />
    </Frame>
  );
}

function BillingMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="2.5" y="6.5" width="19" height="11" />
      <path d="M2.5 10.5 H21.5" />
    </Frame>
  );
}

function ChatMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M4 4 H20 V14.5 H13 L8 20 V14.5 H4 Z" />
    </Frame>
  );
}

function PostJobMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M12 8 V16 M8 12 H16" />
    </Frame>
  );
}

function EmployersMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="4.5" y="3.5" width="15" height="17" />
      <path d="M4.5 9 H19.5 M4.5 14.5 H19.5 M12 3.5 V20.5" />
    </Frame>
  );
}

function NotificationsMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M12 3.5 V6" />
      <path d="M8.5 7 H15.5 L18.5 16 H5.5 Z" />
      <rect x="10.25" y="17.25" width="3.5" height="3" />
    </Frame>
  );
}

function ApplicationsMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M6 3.5 H13 L18.5 9 V20.5 H6 Z" />
      <path d="M13 3.5 V9 H18.5" />
      <path d="M9 13.5 L11.5 16 L15.5 11" />
    </Frame>
  );
}

function SavedMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M7 3.5 H17 V20.5 L12 16.5 L7 20.5 Z" />
    </Frame>
  );
}

function ProfileMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="7.5" r="3.25" />
      <path d="M4.5 20.5 V16 L9 13 H15 L19.5 16 V20.5" />
    </Frame>
  );
}

function SettingsMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M4 8 H20 M4 16 H20" />
      <rect x="7" y="6" width="4" height="4" />
      <rect x="13" y="14" width="4" height="4" />
    </Frame>
  );
}

function AdminMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M12 3.5 L20 7 V12.5 L12 20.5 L4 12.5 V7 Z" />
    </Frame>
  );
}

function MetricsMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="4.5" y="12" width="3.5" height="8.5" />
      <rect x="10.25" y="4.5" width="3.5" height="16" />
      <rect x="16" y="8.5" width="3.5" height="12" />
    </Frame>
  );
}

function ServicesMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" />
      <rect x="13.5" y="3.5" width="7" height="7" />
      <rect x="3.5" y="13.5" width="7" height="7" />
      <rect x="13.5" y="13.5" width="7" height="7" />
    </Frame>
  );
}

/** A ready piece of work: a tag with a price hole (D446). */
function FreelanceMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M3.5 12 L12 3.5 H20.5 V12 L12 20.5 Z" />
      <path d="M15.5 7.5 H16.5 V8.5 H15.5 Z" />
    </Frame>
  );
}

function LoginMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M15 4 H20.5 V20 H15" />
      <path d="M3.5 12 H15" />
      <path d="M11 8.5 L15 12 L11 15.5" />
    </Frame>
  );
}

export const NAV_ICONS: Record<string, NavMark> = {
  "/jobs": JobsMark,
  "/events": EventsMark,
  "/freelance": FreelanceMark,
  "/matches": MatchesMark,
  "/pricing": PricingMark,
  "/employer/jobs": EmployerJobsMark,
  "/employer/company": CompanyMark,
  "/employer/billing": BillingMark,
  "/chat": ChatMark,
  "/post-job": PostJobMark,
  "/for-employers": EmployersMark,
  "/notifications": NotificationsMark,
  "/applications": ApplicationsMark,
  "/saved-jobs": SavedMark,
  "/profile": ProfileMark,
  "/settings/account": SettingsMark,
  "/admin": AdminMark,
  "/admin/metrics": MetricsMark,
  "/services": ServicesMark,
  "/login": LoginMark,
};

export function iconForNav(href: string): NavMark | undefined {
  return NAV_ICONS[href];
}

/** Phone sheet only. The wide bar keeps its own list. Missing hrefs are skipped. */
const PHONE_NAV_ORDER = {
  candidate: [
    "/jobs",
    "/events",
    "/applications",
    "/chat",
    "/saved-jobs",
    "/notifications",
    "/profile",
    "/pricing",
    "/freelance",
    "/services",
    "/post-job",
    "/settings/account",
    "/admin",
    "/admin/metrics",
  ],
  guest: [
    "/jobs",
    "/events",
    "/chat",
    "/freelance",
    "/pricing",
    "/services",
    "/post-job",
    "/for-employers",
    "/login",
  ],
  employer: [
    "/employer/jobs",
    "/post-job",
    "/employer/company",
    "/employer/billing",
    "/chat",
    "/jobs",
    "/events",
    "/freelance",
    "/services",
    "/pricing",
    "/notifications",
    "/settings/account",
    "/admin",
    "/admin/metrics",
  ],
} as const;

export type PhoneNavRole = keyof typeof PHONE_NAV_ORDER;

export function orderPhoneNav<T extends { href: string }>(
  items: readonly T[],
  role: PhoneNavRole,
): T[] {
  const byHref = new Map(items.map((item) => [item.href, item]));
  const ordered: T[] = [];
  for (const href of PHONE_NAV_ORDER[role]) {
    const item = byHref.get(href);
    if (item) ordered.push(item);
  }
  return ordered;
}
