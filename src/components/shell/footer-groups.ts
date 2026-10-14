/**
 * Footer groups (D333, D388, D396). Real routes only: an item without
 * `href` is shown as plain text, not as a link to a page that does not
 * exist. The six Company items without an address are an open question
 * with no code task until the founder names an address (D396, D404).
 */
export type FooterItem = { label: string; href?: string };
export type FooterGroup = { title: string; items: readonly FooterItem[] };

export const footerGroups: readonly FooterGroup[] = [
  {
    title: "footer.platform",
    items: [
      { href: "/jobs", label: "nav.jobs" },
      { href: "/post-job", label: "nav.postJob" },
      { href: "/pricing", label: "nav.pricing" },
      { href: "/chat", label: "nav.chat" },
    ],
  },
  {
    title: "footer.resources",
    items: [
      { href: "/for-employers", label: "nav.employers" },
      { href: "/salaries", label: "footer.salaries" },
      { href: "/#faq", label: "footer.faq" },
    ],
  },
  {
    title: "footer.companyGroup",
    items: [
      { href: "/company", label: "footer.aboutUs" },
      { label: "footer.feedback" },
      { label: "footer.emailSupport" },
      { label: "footer.ambassadorProgram" },
      { label: "footer.mediaPressKit" },
      { label: "footer.apiAccess" },
      { label: "footer.verifyOfficialAccounts" },
      { href: "/terms", label: "footer.termsPrivacy" },
    ],
  },
  {
    title: "footer.sites",
    items: [{ href: "/portfolio", label: "footer.portfolio" }],
  },
  {
    title: "footer.legal",
    items: [
      { href: "/terms", label: "legal.terms" },
      { href: "/privacy", label: "legal.privacy" },
      { href: "/privacy#cookie-settings", label: "legal.cookies" },
    ],
  },
];
