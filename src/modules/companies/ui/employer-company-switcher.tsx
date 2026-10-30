import { Link } from "@/i18n/navigation";

type CompanyOption = { id: string; name: string };
type EmployerPath =
  "/employer/jobs" | "/employer/jobs/new" | "/employer/billing";

export function EmployerCompanySwitcher({
  companies,
  selectedCompanyId,
  pathname,
  label,
}: {
  companies: readonly CompanyOption[];
  selectedCompanyId: string | null;
  pathname: EmployerPath;
  label: string;
}) {
  if (companies.length < 2) return null;

  return (
    <nav aria-label={label} className="border-b border-line">
      <ul className="-mb-px flex gap-6 overflow-x-auto">
        {companies.map((company) => {
          const active = company.id === selectedCompanyId;
          return (
            <li key={company.id}>
              <Link
                href={{ pathname, query: { companyId: company.id } }}
                aria-current={active ? "page" : undefined}
                className={`t-nav relative inline-flex min-h-11 items-center whitespace-nowrap border-b-2 transition-colors duration-[120ms] ${active ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"}`}
              >
                {company.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
