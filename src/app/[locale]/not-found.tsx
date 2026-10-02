import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-10">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p>{t("body")}</p>
    </main>
  );
}
