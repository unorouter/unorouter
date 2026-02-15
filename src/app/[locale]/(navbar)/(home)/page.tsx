import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">{t("HOME.TITLE")}</h1>
    </div>
  );
}
