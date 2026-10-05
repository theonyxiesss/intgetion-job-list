"use client";

import { Select } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

/** Phone navigation: one menu instead of a sideways-scrolling row (DESIGN 9.11). */
export function AdminSectionMenu({
  label,
  active,
  sections,
}: {
  label: string;
  active: string;
  sections: { key: string; href: string; label: string }[];
}) {
  const router = useRouter();
  return (
    <div className="lg:hidden">
      <label htmlFor="admin-section" className="sr-only">
        {label}
      </label>
      <Select
        id="admin-section"
        value={active}
        onChange={(event) => {
          const next = sections.find(
            (section) => section.key === event.target.value,
          );
          if (next) router.push(next.href);
        }}
      >
        {sections.map((section) => (
          <option key={section.key} value={section.key}>
            {section.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
