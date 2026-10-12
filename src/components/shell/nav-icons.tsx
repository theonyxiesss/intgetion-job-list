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
      <rect x="3.5" y="3.5" width="17" height="17" />
      <path d="M7.5 9 H16.5 M7.5 13.5 H13.5" />
    </Frame>
  );
}

function MatchesMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="3" y="3" width="11" height="11" />
      <rect x="10" y="10" width="11" height="11" />
    </Frame>
  );
}

function PricingMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M4 6.5 H20 M4 12 H14 M4 17.5 H9" />
    </Frame>
  );
}

function EmployerJobsMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="3" y="9" width="18" height="11" />
      <path d="M9 9 V5 H15 V9" />
    </Frame>
  );
}

function CompanyMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="3" y="13" width="5" height="7" />
      <rect x="9.5" y="4" width="5" height="16" />
      <rect x="16" y="9" width="5" height="11" />
    </Frame>
  );
}

function BillingMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M12 3.5 L20.5 12 L12 20.5 L3.5 12 Z" />
    </Frame>
  );
}

function ChatMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M4 4 H20 V14 H11 L7 18 V14 H4 Z" />
    </Frame>
  );
}

function PostJobMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M12 4 V20 M4 12 H20" />
    </Frame>
  );
}

function EmployersMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="3" y="7" width="7" height="10" />
      <rect x="14" y="7" width="7" height="10" />
    </Frame>
  );
}

function NotificationsMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <rect x="3.5" y="6" width="14" height="14" />
      <circle cx="17.5" cy="6" r="1.6" fill="currentColor" stroke="none" />
    </Frame>
  );
}

function ApplicationsMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M4 12 H18 M13 7 L19 12 L13 17" />
    </Frame>
  );
}

function SavedMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M7 3.5 H17 V20.5 L12 16 L7 20.5 Z" />
    </Frame>
  );
}

function ProfileMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="7.5" r="3.25" />
      <path d="M4.5 19.5 V15 H8.5 V13 H15.5 V15 H19.5 V19.5" />
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
      <path d="M12 3 L20 7.5 V13.5 L12 21 L4 13.5 V7.5 Z" />
    </Frame>
  );
}

function MetricsMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M4 19.5 H20 M7 19.5 V12 M12 19.5 V5.5 M17 19.5 V9" />
    </Frame>
  );
}

function LoginMark(props: NavMarkProps) {
  return (
    <Frame {...props}>
      <path d="M10 4 H4.5 V20 H10 M12 12 H19 M15 8 L19.5 12 L15 16" />
    </Frame>
  );
}

export const NAV_ICONS: Record<string, NavMark> = {
  "/jobs": JobsMark,
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
  "/login": LoginMark,
};

export function iconForNav(href: string): NavMark | undefined {
  return NAV_ICONS[href];
}
