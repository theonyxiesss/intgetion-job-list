/**
 * Footer groups (D333, D388, D396, D596). Hire and find work mirror the
 * header menu, with the same action words. Real routes only: an item without
 * `href` is shown as plain text, not as a link to a page that does not
 * exist. The six Company items without an address are an open question
 * with no code task until the founder names an address (D396, D404).
 */
export type FooterItem = { label: string; href?: string };
export type FooterGroup = { title: string; items: readonly FooterItem[] };

export const footerGroups: readonly FooterGroup[] = [
  {
    title: "headerNav.hire",
    items: [
      { href: "/post-job", label: "nav.postJob" },
      { href: "/freelance", label: "headerNav.findFreelancer" },
      { href: "/campaigns", label: "headerNav.orderUgc" },
      { href: "/services", label: "headerNav.orderService" },
      { href: "/pricing", label: "nav.pricing" },
    ],
  },
  {
    title: "headerNav.findWork",
    items: [
      { href: "/jobs", label: "headerNav.remoteJobs" },
      { href: "/freelance/tasks", label: "headerNav.freelanceTasks" },
      { href: "/creator/workspace", label: "headerNav.creatorWork" },
      { href: "/events", label: "headerNav.eventsConfs" },
      { href: "/salaries", label: "footer.salaries" },
    ],
  },
  {
    title: "footer.resources",
    items: [
      { href: "/chat", label: "headerNav.spokiAgent" },
      { href: "/for-employers", label: "nav.employers" },
      { href: "/#faq", label: "footer.faq" },
      { href: "/portfolio", label: "footer.portfolio" },
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
    title: "footer.legal",
    items: [
      { href: "/terms", label: "legal.terms" },
      { href: "/privacy", label: "legal.privacy" },
      { href: "/privacy#cookie-settings", label: "legal.cookies" },
    ],
  },
];
