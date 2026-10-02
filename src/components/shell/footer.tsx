import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("product");

  return (
    <footer className="mt-auto border-t border-current/15">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <p>{t("name")}</p>
      </div>
    </footer>
  );
}
